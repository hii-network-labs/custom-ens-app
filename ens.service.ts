import { Injectable, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getAddress, getBytes } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';
import { Interface, toUtf8Bytes, hexlify, parseUnits, ZeroAddress, keccak256, namehash, JsonRpcProvider, Wallet, Contract } from "ethers";
import { isValidDomainName, isDomainRegistered, encrypt } from './ens.helper';
import * as crypto from 'crypto';

// Interface cho sự kiện GraphQL
interface GraphQLEvent {
    id: string;
    blockNumber: string;
    transactionID: string;
}

// Interface cho tên miền GraphQL
interface GraphQLDomain {
    id: string;
    name: string;
    labelName?: string;
    labelhash?: string;
    owner?: { id: string };
    resolver?: { 
        id: string;
        address: string;
        texts?: string[];
        coinTypes?: number[];
    };
    ttl?: string;
    isMigrated?: boolean;
    createdAt?: string;
    events?: GraphQLEvent[];
}

// Interface cho phản hồi GraphQL
interface GraphQLResponse {
    data?: {
        domains: GraphQLDomain[];
    };
    errors?: Array<{ message: string }>;
}

// Interface cho sự kiện đăng ký tên miền
interface NameRegisteredEvent {
    name: string;
    expires: bigint;
}

@Injectable()
export class EnsService implements OnModuleInit {
    private provider: JsonRpcProvider;
    private controllerWallet: Wallet;
    private ethController: Contract;
    private registry: Contract;
    private resolver: Contract;
    private readonly contractDir: string;
    private readonly ensListFile: string;
    private ensCache = new Map<string, {data: any, timestamp: number}>();
    private CACHE_TTL = 5 * 60 * 1000; // 5 phút

    constructor(private configService: ConfigService) {
        this.contractDir = path.join(process.cwd(), 'contract_hii');
        const providerUrl = this.configService.get<string>('RPC_URL') || 'https://rpc.testnet.hii.network';
        this.provider = new JsonRpcProvider(providerUrl);
        
        const controllerKey = this.configService.get<string>('CONTROLLER_PRIVATE_KEY');
        if (!controllerKey) {
            throw new Error('CONTROLLER_PRIVATE_KEY chưa được cấu hình');
        }
        this.controllerWallet = new Wallet(controllerKey, this.provider);
        this.ensListFile = path.join(process.cwd(), 'ens-list.json');
    }

    async onModuleInit() {
        try {
            // Khởi tạo các contract khi module được khởi tạo
            this.ethController = this.getContract("ETHRegistrarController");
            this.registry = this.getContract("ENSRegistry");
            this.resolver = this.getContract("PublicResolver");
        } catch (error) {
            console.error('Lỗi khởi tạo service ENS:', error);
            throw new Error(`Không thể khởi tạo service ENS: ${error.message}`);
        }
    }

    private getContract(name: string, address: string | null = null, walletOrProvider: any = null) {
        try {
            const filePath = path.join(this.contractDir, `${name}.json`);
            const metadata = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            const contractAddress = address ?? metadata.address;
            const signerOrProvider = walletOrProvider ?? this.controllerWallet;
            return new Contract(contractAddress, metadata.abi, signerOrProvider);
        } catch (error) {
            console.error(`Lỗi khi lấy contract ${name}:`, error);
            throw new Error(`Không thể khởi tạo contract ${name}: ${error.message}`);
        }
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    createNewWallet() {
        const wallet = Wallet.createRandom();
        // Tạo khóa mã hóa ngẫu nhiên
        const encryptionKey = crypto.randomBytes(32).toString('hex');
        // Mã hóa private key
        const encryptedPrivateKey = encrypt(wallet.privateKey, encryptionKey);
        
        return {
            encryptedPrivateKey,
            // encryptionKey, // Cần lưu lại key này để giải mã sau này
            address: wallet.address
        };
    }

    async registerENS(label: string, ownerAddress: string, email?: string) {
        try {
            // Format và validate label
            let cleanLabel = label.toLowerCase()
                .replace(this.configService.get<string>('DOMAIN_SUFFIX') || '.hii', '')  // Xóa domain suffix nếu có
                .replace('.hi', '')   
                .trim()               
                .replace(/[^a-z0-9-]/g, '');

            // Kiểm tra tên miền hợp lệ
            if (!isValidDomainName(cleanLabel, this.configService)) {
                return {
                    status: 400,
                    message: 'Tên miền phải có ít nhất 5 ký tự và chỉ chứa các ký tự a-z, 0-9, -',
                    data: null
                };
            }

            // Format địa chỉ owner
            try {
                ownerAddress = getAddress(ownerAddress); // Chuẩn hóa địa chỉ
            } catch (error) {
                return {
                    status: 400,
                    message: 'Địa chỉ ví không hợp lệ',
                    data: null
                };
            }

            // Kiểm tra domain đã đăng ký chưa
            const alreadyRegistered = await isDomainRegistered(cleanLabel, this.registry, this.configService);
            if (alreadyRegistered) {
                return {
                    status: 409,
                    message: 'Tên miền này đã được đăng ký.',
                    data: null
                };
            }

            // Kiểm tra số dư của controller wallet
            const balance = await this.provider.getBalance(this.controllerWallet.address);
            if (balance === 0n) {
                return {
                    status: 400,
                    message: 'Controller wallet không đủ token để thực hiện giao dịch.',
                    data: null
                };
            }

            const duration = BigInt(60 * 60 * 24 * 30); // 30 ngày tính bằng giây
            const resolverAddress = await this.resolver.getAddress();
            
            // Kiểm tra resolver address
            if (resolverAddress === ZeroAddress) {
                return {
                    status: 500,
                    message: 'Không thể lấy địa chỉ resolver.',
                    data: null
                };
            }

            // Tạo data cho resolver
            const data = await this.makeData(`${cleanLabel}.hii`, ownerAddress, email);
            const secret = keccak256(toUtf8Bytes(this.configService.get<string>('CONTROLLER_PRIVATE_KEY')));
            
            const params = [
                cleanLabel,                  // label - không bao gồm .hii
                ownerAddress,                // địa chỉ owner đã được chuẩn hóa
                duration,                    // thời hạn đăng ký
                secret,                      // secret hash
                resolverAddress,             // địa chỉ resolver
                data,                        // resolver data
                true,                        // shouldSetReverseRecord
                0                           // ownerControlledFuses
            ];

            console.log('Đăng ký với các tham số:', {
                label: cleanLabel,
                owner: ownerAddress,
                duration: duration.toString(),
                resolver: resolverAddress,
                hasData: data.length > 0
            });

            try {
                // Tạo commitment
                const commitmentHash = await this.ethController.makeCommitment(...params);
                console.log('Mã cam kết:', commitmentHash);
                
                const commitTx = await this.ethController.commit(commitmentHash);
                const commitReceipt = await commitTx.wait();
                console.log('Mã giao dịch cam kết:', commitReceipt.hash);

                // Đợi thời gian tối thiểu giữa commit và register
                const minCommitmentAge = await this.ethController.minCommitmentAge();
                console.log('Đang đợi thời gian cam kết:', Number(minCommitmentAge), 'giây');
                await this.sleep(Number((minCommitmentAge + 5n) * 1000n));

                // Tính giá đăng ký
                const { base, premium } = await this.ethController.rentPrice(cleanLabel, duration);
                const price = base + premium;
                console.log('Giá đăng ký:', price.toString());

                try {
                    // Ước tính gas
                    const gasEstimate = await this.ethController.register.estimateGas(...params, { value: price });
                    console.log('Ước tính gas:', gasEstimate.toString());

                    // Thực hiện đăng ký
                    const registerTx = await this.ethController.register(...params, {
                        value: price,
                        gasLimit: gasEstimate * 120n / 100n, // Thêm 20% gas limit để đảm bảo
                    });

                    // Đợi transaction hoàn thành và lấy receipt
                    const receipt = await registerTx.wait();
                    
                    return {
                        status: 200,
                        message: 'Đăng ký tên miền thành công',
                        data: {
                            label: `${cleanLabel}.hii`,
                            ownerAddress,
                            email,
                            txHash: receipt.hash,
                            blockNumber: receipt.blockNumber
                        }
                    };
                } catch (error) {
                    console.error('Lỗi khi ước tính gas hoặc đăng ký:', error);
                    return {
                        status: 500,
                        message: `Lỗi khi đăng ký: ${error.shortMessage || error.message}`,
                        data: {
                            error: error.shortMessage || error.message,
                            code: error.code,
                            details: error.info
                        }
                    };
                }
            } catch (error) {
                console.error('Lỗi khi tạo commitment:', error);
                return {
                    status: 500,
                    message: `Lỗi khi tạo commitment: ${error.message}`,
                    data: {
                        error: error.message,
                        code: error.code,
                        details: error.info
                    }
                };
            }
        } catch (error) {
            console.error('Lỗi đăng ký ENS:', error);
            return {
                status: 500,
                message: `Lỗi đăng ký ENS: ${error.message}`,
                data: null
            };
        }
    }

    async makeData(domain: string, address: string, email?: string): Promise<readonly string[]> {
        try {
            const node = namehash(domain);
            const encodedSetAddr = this.resolver.interface.encodeFunctionData('setAddr(bytes32,uint256,bytes)', [
                node,
                60,
                getBytes(getAddress(address))
            ]);

            const dataList = [encodedSetAddr];

            if (email) {
                const encodedSetText = this.resolver.interface.encodeFunctionData('setText(bytes32,string,string)', [
                    node,
                    'email',
                    email
                ]);
                dataList.push(encodedSetText);
            }

            return dataList;
        } catch (error) {
            console.error('Lỗi khi tạo data cho tên miền:', domain, error);
            throw new Error(`Không thể tạo data cho tên miền ${domain}: ${error.message}`);
        }
    }

    // Lấy bản ghi văn bản
    async getTextRecord(name: string, key: string): Promise<any> {
        try {
            const node = namehash(name);
            
            // Kiểm tra domain có tồn tại không
            const owner = await this.registry.owner(node);
            if (owner === ZeroAddress) {
                return {
                    status: 404,
                    message: 'Không tìm thấy tên miền',
                    data: null
                };
            }

            // Kiểm tra resolver
            const resolverAddress = await this.registry.resolver(node);
            if (resolverAddress === ZeroAddress) {
                return {
                    status: 404,
                    message: 'Tên miền này chưa được thiết lập resolver',
                    data: null
                };
            }

            // Lấy resolver contract
            const resolverContract = this.getContract("PublicResolver", resolverAddress, this.provider);
            const value = await resolverContract.text(node, key);
            
            return {
                status: 200,
                message: 'Thành công',
                data: {
                    name,
                    key,
                    value: value || ''
                }
            };
        } catch (error) {
            console.error('Lỗi khi lấy bản ghi văn bản:', error);
            return {
                status: 500,
                message: `Không thể lấy bản ghi văn bản cho ${name}.${key}: ${error.message}`,
                data: null
            };
        }
    }

    // Lấy danh sách ENS theo địa chỉ
    async getEnsListByAddress(address: string) {
        try {
            address = getAddress(address).toLowerCase();

            // Kiểm tra cache
            const cached = this.ensCache.get(address);
            if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
                return {
                    status: 200,
                    message: cached.data.length > 0 ? 'Thành công' : 'Không tìm thấy tên miền nào',
                    data: cached.data
                };
            }

            const domains = [];
            const nameWrapper = this.getContract("NameWrapper");
            const resolverAddress = await this.resolver.getAddress();
            const resolver = this.getContract("PublicResolver", resolverAddress, this.provider);

            // Lấy events trong 1000 block gần nhất thay vì toàn bộ
            const currentBlock = await this.provider.getBlockNumber();
            const fromBlock = Math.max(0, currentBlock - 1000);
            
            const filter = this.ethController.filters.NameRegistered();
            const events = await this.ethController.queryFilter(filter, fromBlock);

            // Xử lý song song các events
            await Promise.all(events.map(async (event) => {
                try {
                    const eventData = event as unknown as { args: NameRegisteredEvent };
                    const { name, expires } = eventData.args;
                    if (!name) return;

                    const domainName = `${name}.hii`;
                    const node = namehash(domainName);
                    
                    try {
                        const nameWrapperOwner = await nameWrapper.ownerOf(node);
                        
                        if (nameWrapperOwner.toLowerCase() === address.toLowerCase()) {
                            // Lấy thông tin resolver và email song song
                            const [resolvedAddr, email] = await Promise.all([
                                resolver.addr(node),
                                resolver.text(node, 'email').catch(() => '')
                            ]);

                            domains.push({
                                id: node,
                                domain: name,
                                fullName: domainName,
                                owner: nameWrapperOwner,
                                resolverAddress: resolverAddress,
                                resolvedAddress: resolvedAddr,
                                email: email,
                                ttl: (await this.registry.ttl(node)).toString(),
                                isMigrated: true,
                                createdAt: new Date(Number(expires) * 1000).toISOString()
                            });
                        }
                    } catch (error) {
                        console.log(`Domain ${domainName} không được wrap trong NameWrapper:`, error);
                    }
                } catch (error) {
                    console.error('Lỗi xử lý tên miền:', error);
                }
            }));

            // Lưu vào cache
            this.ensCache.set(address, {
                data: domains,
                timestamp: Date.now()
            });

            return {
                status: 200,
                message: domains.length > 0 ? 'Thành công' : 'Không tìm thấy tên miền nào',
                data: domains
            };
        } catch (error) {
            console.error('Lỗi trong getEnsListByAddress:', error);
            return {
                status: 500,
                message: `Không thể lấy danh sách ENS: ${error.message}`,
                data: null
            };
        }
    }

    // Hàm lấy domains trực tiếp từ blockchain
    private async getDomainsFromChain(address: string) {
        try {
            console.log('Đang lấy tên miền từ blockchain cho địa chỉ:', address);
            
            // Lấy tất cả các event Transfer có destinationAddress là address này
            const filter = this.registry.filters.Transfer(null, address, null);
            const events = await this.registry.queryFilter(filter);
            
            console.log(`Tìm thấy ${events.length} sự kiện Transfer cho địa chỉ ${address}`);
            
            const domains = [];
            const processedNodes = new Set();
            
            for (const event of events) {
                try {
                    // Parse event data
                    const parsedLog = this.registry.interface.parseLog({
                        topics: event.topics || [],
                        data: event.data
                    });
                    if (!parsedLog) continue;
                    
                    const node = parsedLog.args[2]; // node là arg thứ 3 trong event Transfer
                    
                    // Bỏ qua nếu đã xử lý node này
                    if (processedNodes.has(node)) continue;
                    processedNodes.add(node);
                    
                    // Kiểm tra owner hiện tại của node
                    const currentOwner = await this.registry.owner(node);
                    console.log('Kiểm tra node:', node, 'Owner hiện tại:', currentOwner);
                    
                    // Chỉ lấy những domain mà address vẫn đang sở hữu
                    if (currentOwner.toLowerCase() === address.toLowerCase()) {
                        const resolverAddress = await this.registry.resolver(node);
                        
                        // Thử lấy tên từ resolver
                        let name = '';
                        if (resolverAddress !== ZeroAddress) {
                            const resolver = this.getContract("PublicResolver", resolverAddress, this.provider);
                            try {
                                name = await resolver.name(node);
                            } catch (e) {
                                console.log('Lỗi khi lấy tên từ resolver:', e);
                            }
                        }

                        // Nếu không lấy được tên từ resolver, thử lấy từ event
                        if (!name) {
                            // Thử lấy NewOwner events để tìm tên
                            const nameFilter = this.registry.filters.NewOwner(null, null, null);
                            const nameEvents = await this.registry.queryFilter(nameFilter);
                            for (const nameEvent of nameEvents) {
                                const parsedNameEvent = this.registry.interface.parseLog({
                                    topics: nameEvent.topics || [],
                                    data: nameEvent.data
                                });
                                if (parsedNameEvent && parsedNameEvent.args[2] === node) {
                                    name = parsedNameEvent.args[1];
                                    break;
                                }
                            }
                        }

                        let resolverData = {
                            address: resolverAddress,
                            texts: [],
                            coinTypes: []
                        };

                        if (resolverAddress !== ZeroAddress) {
                            const resolver = this.getContract("PublicResolver", resolverAddress, this.provider);
                            try {
                                // Thử lấy email từ resolver
                                const email = await resolver.text(node, 'email');
                                if (email) {
                                    resolverData.texts.push('email');
                                }
                            } catch (e) {
                                console.log('Lỗi khi lấy email:', e);
                            }
                        }

                        domains.push({
                            id: node,
                            domain: name || 'không xác định',
                            fullName: name ? `${name}.hii` : 'không xác định.hii',
                            owner: address,
                            resolver: resolverData,
                            ttl: (await this.registry.ttl(node)).toString(),
                            isMigrated: true,
                            createdAt: new Date().toISOString()
                        });
                    }
                } catch (error) {
                    console.error(`Lỗi xử lý node:`, error);
                    continue;
                }
            }

            // Thử thêm cách khác để lấy domains
            try {
                // Kiểm tra trực tiếp domain test14.hii
                const testNode = namehash('test14.hii');
                const testOwner = await this.registry.owner(testNode);
                console.log('Chủ sở hữu test14.hii:', testOwner);
                
                if (testOwner.toLowerCase() === address.toLowerCase()) {
                    const resolverAddress = await this.registry.resolver(testNode);
                    domains.push({
                        id: testNode,
                        domain: 'test14',
                        fullName: 'test14.hii',
                        owner: address,
                        resolver: {
                            address: resolverAddress,
                            texts: ['email'],
                            coinTypes: []
                        },
                        ttl: (await this.registry.ttl(testNode)).toString(),
                        isMigrated: true,
                        createdAt: new Date().toISOString()
                    });
                }
            } catch (error) {
                console.error('Lỗi kiểm tra test14.hii:', error);
            }

            console.log('Tên miền tìm thấy từ blockchain:', domains);
            return domains;
        } catch (error) {
            console.error('Lỗi khi lấy tên miền từ chain:', error);
            return [];
        }
    }

    async getEnsInfo(name: string): Promise<any> {
        try {
            const node = namehash(name);
            const owner = await this.registry.owner(node);
            if (owner === ZeroAddress) {
                return {
                    status: 404,
                    message: 'Không tìm thấy tên miền',
                    data: null
                };
            }

            // Lấy owner từ NameWrapper
            const nameWrapper = this.getContract("NameWrapper");
            const nameWrapperOwner = await nameWrapper.ownerOf(node);

            const resolverAddress = await this.registry.resolver(node);
            let resolvedAddress = null;
            let email = null;
            if (resolverAddress !== ZeroAddress) {
                try {
                    const resolverContract = this.getContract("PublicResolver", resolverAddress, this.provider);
                    resolvedAddress = await resolverContract.addr(node);
                    email = await resolverContract.text(node, 'email');
                } catch (e) {}
            }
            return {
                status: 200,
                message: 'Thành công',
                data: {
                    name,
                    node,
                    ownerAddress: nameWrapperOwner, // Sử dụng owner từ NameWrapper
                    resolverAddress,
                    resolvedAddress,
                    email: email || '',
                    lastUpdated: new Date().toISOString()
                }
            };
        } catch (error) {
            console.error('Lỗi khi lấy thông tin ENS từ chain:', error);
            return {
                status: 500,
                message: `Không thể lấy thông tin ENS cho ${name}: ${error.message}`,
                data: null
            };
        }
    }

    async checkNameWrapperOwner(name: string): Promise<any> {
        try {
            const nameWrapper = this.getContract("NameWrapper");
            const node = namehash(name);
            const nameWrapperOwner = await nameWrapper.ownerOf(node);

            return {
                status: 200,
                message: 'Thành công',
                data: {
                    domain: name,
                    nameWrapperOwner: nameWrapperOwner
                }
            };
        } catch (error) {
            console.error('Lỗi khi kiểm tra owner từ NameWrapper:', error);
            return {
                status: 500,
                message: `Lỗi khi kiểm tra owner: ${error.message}`,
                data: null
            };
        }
    }
} 