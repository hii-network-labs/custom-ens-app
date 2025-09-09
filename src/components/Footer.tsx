import React from 'react'

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-900 text-white py-8 mt-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* About HNS */}
          <div>
            <h3 className="text-xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              HNS - HII Name Service
            </h3>
            <p className="text-gray-300 leading-relaxed">
              A decentralized naming system built on the Hii Network. Register and manage your HNS domains 
              to create human-readable addresses for your crypto wallets and decentralized applications.
            </p>
          </div>

          {/* Features */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Features</h4>
            <ul className="space-y-2 text-gray-300">
              <li className="flex items-center">
                <span className="w-2 h-2 bg-blue-400 rounded-full mr-3"></span>
                Domain Registration
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-blue-400 rounded-full mr-3"></span>
                Domain Renewal
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-blue-400 rounded-full mr-3"></span>
                Domain Transfer
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-blue-400 rounded-full mr-3"></span>
                Decentralized Resolution
              </li>
            </ul>
          </div>

          {/* Network Info */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Hii Network</h4>
            <p className="text-gray-300 mb-4">
              Built on the secure and efficient Hii Network blockchain, providing fast transactions 
              and low fees for domain management.
            </p>
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-400 rounded-full mr-2"></div>
                <span className="text-sm text-gray-300">Network Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-700 mt-8 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-gray-400 text-sm mb-4 md:mb-0">
              © 2024 HNS - HII Name Service. Decentralized domain registration on Hii Network.
            </div>
            <div className="flex items-center space-x-6 text-sm text-gray-400">
              <span>Powered by Hii Network</span>
              <span>•</span>
              <span>Decentralized Web3 Domains</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer