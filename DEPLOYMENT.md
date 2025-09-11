# Quick Deployment Guide for Vercel

## 🚀 One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/YOUR_REPO_NAME&env=NEXT_PUBLIC_CHAIN_ID,NEXT_PUBLIC_RPC_URL,NEXT_PUBLIC_GRAPHQL_ENDPOINT,NEXT_PUBLIC_ENS_REGISTRY_ADDRESS,NEXT_PUBLIC_BASE_REGISTRAR_ADDRESS,NEXT_PUBLIC_PUBLIC_RESOLVER_ADDRESS,NEXT_PUBLIC_NAME_WRAPPER_ADDRESS)

## 📋 Pre-Deployment Checklist

- [ ] Code is pushed to GitHub
- [ ] All TypeScript errors resolved
- [ ] Build passes locally (`npm run build`)
- [ ] Environment variables prepared

## 🔧 Required Environment Variables

Copy these to your Vercel project settings:

```env
NEXT_PUBLIC_CHAIN_ID=29342
NEXT_PUBLIC_RPC_URL=http://103.69.99.57:8545
NEXT_PUBLIC_GRAPHQL_ENDPOINT=http://103.161.174.53:8000/subgraphs/name/graphprotocol/ens_eth
NEXT_PUBLIC_ENS_REGISTRY_ADDRESS=0x8bA3410bd15155F9bb25e46838A21D2eEa0c0945
NEXT_PUBLIC_BASE_REGISTRAR_ADDRESS=0x222349495048799C19995a65b32d86D20f1BA57A
NEXT_PUBLIC_PUBLIC_RESOLVER_ADDRESS=0xa5895DC687Eb0672fCcd964da618dC99112F2D75
NEXT_PUBLIC_NAME_WRAPPER_ADDRESS=0x1e7339b9e6dC09BE0650a3163f367574679e7497
```

## 🎯 Quick Steps

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Ready for Vercel deployment"
   git push origin main
   ```

2. **Deploy on Vercel**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your GitHub repository
   - Add environment variables
   - Click Deploy

3. **Verify Deployment**
   - Test wallet connection
   - Check domain loading
   - Verify contract interactions

## 🔍 Post-Deployment Testing

- [ ] Application loads without errors
- [ ] MetaMask connection works
- [ ] Domain list displays correctly
- [ ] Registration process functions
- [ ] Transfer and renewal work
- [ ] GraphQL queries return data

## 🆘 Common Issues

**Build Fails:**
- Run `npm run lint` to check for errors
- Ensure all dependencies are installed
- Check TypeScript configuration

**Runtime Errors:**
- Verify environment variables are set
- Check RPC endpoint accessibility
- Confirm contract addresses are correct

**Network Issues:**
- Test RPC URL from external network
- Verify GraphQL endpoint is public
- Check CORS settings if applicable

---

📖 **Full documentation:** See [README.md](./README.md) for detailed deployment instructions.