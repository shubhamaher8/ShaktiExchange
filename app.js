// Energy Trading DApp JavaScript
let provider = null;
let signer = null;
let contract = null;
let userAddress = null;
let isOwner = false;

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Energy Trading DApp loaded');
    
    // Check if contract address is configured
    if (CONFIG.CONTRACT_ADDRESS === "YOUR_CONTRACT_ADDRESS_HERE") {
        Swal.fire({
            icon: 'warning',
            title: 'Configuration Required',
            text: 'Please deploy the contract and update the CONTRACT_ADDRESS in config.js',
            confirmButtonColor: '#3085d6'
        });
        return;
    }
    
    // Setup event listeners
    setupEventListeners();
    
    // Check if MetaMask is installed
    if (typeof window.ethereum !== 'undefined') {
        console.log('MetaMask detected');
        
        // Check if already connected
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
            await connectWallet();
        }
        
        // Listen for account changes
        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', handleChainChanged);
    } else {
        Swal.fire({
            icon: 'error',
            title: 'MetaMask Required',
            text: 'Please install MetaMask to use this application',
            confirmButtonColor: '#3085d6'
        });
    }
});

// Setup event listeners
function setupEventListeners() {
    document.getElementById('connectWallet').addEventListener('click', connectWallet);
    document.getElementById('withdrawBtn').addEventListener('click', withdrawFunds);
    document.getElementById('registerProducer').addEventListener('click', () => registerUser('producer'));
    document.getElementById('registerConsumer').addEventListener('click', () => registerUser('consumer'));
    document.getElementById('sellEnergyForm').addEventListener('submit', handleSellEnergy);
    document.getElementById('togglePauseBtn').addEventListener('click', toggleContractPause);
    
    // Tab switching
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', (e) => {
            switchTab(e.target.id.replace('Tab', ''));
        });
    });
    
    // Refresh buttons
    document.getElementById('refreshMarketplace').addEventListener('click', loadMarketplace);
    document.getElementById('refreshMyListings').addEventListener('click', loadMyListings);
    document.getElementById('refreshHistory').addEventListener('click', loadTransactionHistory);
}

// Connect to MetaMask wallet
async function connectWallet() {
    try {
        if (typeof window.ethereum === 'undefined') {
            throw new Error('MetaMask is not installed');
        }

        // Request account access
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        // Create provider and signer
        provider = new ethers.BrowserProvider(window.ethereum);
        signer = await provider.getSigner();
        userAddress = await signer.getAddress();
        
        // Check network
        const network = await provider.getNetwork();
        if (network.chainId.toString() !== '11155111') { // Sepolia chainId
            await switchToSepolia();
            return;
        }
        
        // Create contract instance
        contract = new ethers.Contract(CONFIG.CONTRACT_ADDRESS, CONFIG.CONTRACT_ABI, signer);
        
        // Update UI
        updateConnectionStatus(true);
        await updateWalletInfo();
        await checkContractStatus();
        await checkOwnership();
        
        // Load initial data
        await loadMarketplace();
        
        console.log('Wallet connected:', userAddress);
        
        Swal.fire({
            icon: 'success',
            title: 'Wallet Connected!',
            text: `Connected to ${userAddress.substring(0, 10)}...`,
            timer: 2000,
            showConfirmButton: false
        });
        
    } catch (error) {
        console.error('Error connecting wallet:', error);
        Swal.fire({
            icon: 'error',
            title: 'Connection Failed',
            text: error.message || 'Failed to connect wallet'
        });
    }
}

// Switch to Sepolia testnet
async function switchToSepolia() {
    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: CONFIG.NETWORK.chainId }]
        });
        // Retry connection after network switch
        setTimeout(() => connectWallet(), 1000);
    } catch (switchError) {
        if (switchError.code === 4902) {
            try {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [CONFIG.NETWORK]
                });
                setTimeout(() => connectWallet(), 1000);
            } catch (addError) {
                console.error('Error adding network:', addError);
            }
        }
    }
}

// Update connection status UI
function updateConnectionStatus(connected) {
    const statusElement = document.getElementById('connectionStatus');
    const connectButton = document.getElementById('connectWallet');
    
    if (connected) {
        statusElement.textContent = 'Connected';
        statusElement.className = 'bg-green-500 text-white px-3 py-1 rounded-full text-sm';
        connectButton.textContent = 'Disconnect';
        document.getElementById('walletInfo').classList.remove('hidden');
        document.getElementById('registrationSection').classList.remove('hidden');
    } else {
        statusElement.textContent = 'Not Connected';
        statusElement.className = 'bg-red-500 text-white px-3 py-1 rounded-full text-sm';
        connectButton.textContent = 'Connect Wallet';
        document.getElementById('walletInfo').classList.add('hidden');
        document.getElementById('registrationSection').classList.add('hidden');
    }
}

// Update wallet information
async function updateWalletInfo() {
    if (!provider || !userAddress) return;
    
    try {
        // Update wallet address
        document.getElementById('walletAddress').textContent = 
            `${userAddress.substring(0, 6)}...${userAddress.substring(38)}`;
        
        // Update ETH balance
        const ethBalance = await provider.getBalance(userAddress);
        document.getElementById('ethBalance').textContent = 
            `${parseFloat(ethers.formatEther(ethBalance)).toFixed(4)} ETH`;
        
        // Update energy balance
        const energyBalance = await contract.getEnergyBalance(userAddress);
        document.getElementById('energyBalance').textContent = 
            `${parseFloat(ethers.formatEther(energyBalance)).toFixed(2)} kWh`;
        
        // Update pending earnings
        const pendingEarnings = await contract.getPendingWithdrawals(userAddress);
        document.getElementById('pendingEarnings').textContent = 
            `${parseFloat(ethers.formatEther(pendingEarnings)).toFixed(6)} ETH`;
            
        // Show/hide withdraw button
        const withdrawBtn = document.getElementById('withdrawBtn');
        if (parseFloat(ethers.formatEther(pendingEarnings)) > 0) {
            withdrawBtn.style.display = 'block';
        } else {
            withdrawBtn.style.display = 'none';
        }
        
    } catch (error) {
        console.error('Error updating wallet info:', error);
    }
}

// Check contract status (paused/active)
async function checkContractStatus() {
    try {
        const isPaused = await contract.isPaused();
        const statusIcon = document.getElementById('contractStatusIcon');
        const statusText = document.getElementById('contractStatusText');
        
        if (isPaused) {
            statusIcon.className = 'w-3 h-3 rounded-full bg-red-500 mr-3';
            statusText.textContent = 'Paused';
            statusText.className = 'text-sm font-medium text-red-600 ml-1';
        } else {
            statusIcon.className = 'w-3 h-3 rounded-full bg-green-500 mr-3 pulse-green';
            statusText.textContent = 'Active';
            statusText.className = 'text-sm font-medium text-green-600 ml-1';
        }
        
        document.getElementById('contractStatus').classList.remove('hidden');
    } catch (error) {
        console.error('Error checking contract status:', error);
    }
}

// Check if user is contract owner
async function checkOwnership() {
    try {
        const owner = await contract.owner();
        isOwner = owner.toLowerCase() === userAddress.toLowerCase();
        
        if (isOwner) {
            document.getElementById('ownerControls').classList.remove('hidden');
            updatePauseButton();
        }
    } catch (error) {
        console.error('Error checking ownership:', error);
    }
}

// Update pause button text
async function updatePauseButton() {
    try {
        const isPaused = await contract.isPaused();
        const pauseBtn = document.getElementById('togglePauseBtn');
        
        if (isPaused) {
            pauseBtn.textContent = 'Resume Contract';
            pauseBtn.className = 'bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors text-sm';
        } else {
            pauseBtn.textContent = 'Pause Contract';
            pauseBtn.className = 'bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors text-sm';
        }
    } catch (error) {
        console.error('Error updating pause button:', error);
    }
}

// Register user as producer or consumer
async function registerUser(type) {
    if (!contract) {
        Swal.fire({
            icon: 'error',
            title: 'Not Connected',
            text: 'Please connect your wallet first'
        });
        return;
    }
    
    try {
        showLoading(true);
        
        let tx;
        if (type === 'producer') {
            tx = await contract.registerAsProducer();
        } else {
            tx = await contract.registerAsConsumer();
        }
        
        await tx.wait();
        
        Swal.fire({
            icon: 'success',
            title: 'Registration Successful!',
            text: `You are now registered as a ${type}`,
            timer: 2000,
            showConfirmButton: false
        });
        
        await updateWalletInfo();
        
    } catch (error) {
        console.error('Error registering user:', error);
        Swal.fire({
            icon: 'error',
            title: 'Registration Failed',
            text: error.reason || error.message || 'Failed to register user'
        });
    } finally {
        showLoading(false);
    }
}

// Handle sell energy form submission
async function handleSellEnergy(event) {
    event.preventDefault();
    
    if (!contract) {
        Swal.fire({
            icon: 'error',
            title: 'Not Connected',
            text: 'Please connect your wallet first'
        });
        return;
    }
    
    const formData = new FormData(event.target);
    const amount = parseFloat(formData.get('energyAmount'));
    const price = parseFloat(formData.get('energyPrice'));
    
    if (amount <= 0 || price <= 0) {
        Swal.fire({
            icon: 'error',
            title: 'Invalid Input',
            text: 'Amount and price must be greater than 0'
        });
        return;
    }
    
    try {
        showLoading(true);
        
        // Convert to wei
        const amountWei = ethers.parseEther(amount.toString());
        const priceWei = ethers.parseEther(price.toString());
        
        const tx = await contract.sellEnergy(amountWei, priceWei);
        await tx.wait();
        
        Swal.fire({
            icon: 'success',
            title: 'Energy Listed!',
            text: `Successfully listed ${amount} kWh for ${price} ETH per kWh`,
            timer: 3000,
            showConfirmButton: false
        });
        
        // Reset form and update UI
        event.target.reset();
        await updateWalletInfo();
        await loadMarketplace();
        await loadMyListings();
        
    } catch (error) {
        console.error('Error selling energy:', error);
        Swal.fire({
            icon: 'error',
            title: 'Listing Failed',
            text: error.reason || error.message || 'Failed to list energy for sale'
        });
    } finally {
        showLoading(false);
    }
}

// Buy energy from a listing
async function buyEnergy(listingId, totalCost) {
    if (!contract) {
        Swal.fire({
            icon: 'error',
            title: 'Not Connected',
            text: 'Please connect your wallet first'
        });
        return;
    }
    
    try {
        const result = await Swal.fire({
            title: 'Confirm Purchase',
            text: `Are you sure you want to buy this energy for ${parseFloat(ethers.formatEther(totalCost)).toFixed(6)} ETH?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, buy it!'
        });
        
        if (!result.isConfirmed) return;
        
        showLoading(true);
        
        const tx = await contract.buyEnergy(listingId, {
            value: totalCost
        });
        
        await tx.wait();
        
        Swal.fire({
            icon: 'success',
            title: 'Purchase Successful!',
            text: 'Energy has been added to your balance',
            timer: 3000,
            showConfirmButton: false
        });
        
        // Update UI
        await updateWalletInfo();
        await loadMarketplace();
        await loadTransactionHistory();
        
    } catch (error) {
        console.error('Error buying energy:', error);
        Swal.fire({
            icon: 'error',
            title: 'Purchase Failed',
            text: error.reason || error.message || 'Failed to buy energy'
        });
    } finally {
        showLoading(false);
    }
}

// Withdraw funds
async function withdrawFunds() {
    if (!contract) {
        Swal.fire({
            icon: 'error',
            title: 'Not Connected',
            text: 'Please connect your wallet first'
        });
        return;
    }
    
    try {
        showLoading(true);
        
        const tx = await contract.withdrawFunds();
        await tx.wait();
        
        Swal.fire({
            icon: 'success',
            title: 'Withdrawal Successful!',
            text: 'Funds have been transferred to your wallet',
            timer: 3000,
            showConfirmButton: false
        });
        
        await updateWalletInfo();
        
    } catch (error) {
        console.error('Error withdrawing funds:', error);
        Swal.fire({
            icon: 'error',
            title: 'Withdrawal Failed',
            text: error.reason || error.message || 'Failed to withdraw funds'
        });
    } finally {
        showLoading(false);
    }
}

// Toggle contract pause (owner only)
async function toggleContractPause() {
    if (!contract || !isOwner) {
        Swal.fire({
            icon: 'error',
            title: 'Access Denied',
            text: 'Only the contract owner can perform this action'
        });
        return;
    }
    
    try {
        showLoading(true);
        
        const tx = await contract.togglePause();
        await tx.wait();
        
        await checkContractStatus();
        await updatePauseButton();
        
        Swal.fire({
            icon: 'success',
            title: 'Contract Status Updated',
            timer: 2000,
            showConfirmButton: false
        });
        
    } catch (error) {
        console.error('Error toggling pause:', error);
        Swal.fire({
            icon: 'error',
            title: 'Operation Failed',
            text: error.reason || error.message || 'Failed to update contract status'
        });
    } finally {
        showLoading(false);
    }
}

// Load marketplace listings
async function loadMarketplace() {
    if (!contract) return;
    
    try {
        const listings = await contract.getListings();
        const listingsContainer = document.getElementById('energyListings');
        
        if (listings.length === 0) {
            listingsContainer.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <i class="fas fa-store text-6xl text-gray-300 mb-4"></i>
                    <p class="text-xl text-gray-500">No energy listings available</p>
                    <p class="text-gray-400">Be the first to list energy for sale!</p>
                </div>
            `;
            return;
        }
        
        listingsContainer.innerHTML = listings.map(listing => {
            const amount = parseFloat(ethers.formatEther(listing.amount));
            const pricePerKWh = parseFloat(ethers.formatEther(listing.pricePerKWh));
            const totalCost = amount * pricePerKWh;
            const isOwnListing = listing.producer.toLowerCase() === userAddress?.toLowerCase();
            
            return `
                <div class="bg-white rounded-lg card-shadow p-6 border border-gray-200 hover:border-blue-300 transition-colors">
                    <div class="flex justify-between items-start mb-4">
                        <div>
                            <h3 class="text-lg font-semibold text-gray-900">
                                ${amount.toFixed(2)} kWh
                            </h3>
                            <p class="text-sm text-gray-600">
                                Seller: ${listing.producer.substring(0, 8)}...${listing.producer.substring(34)}
                            </p>
                        </div>
                        <span class="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                            Active
                        </span>
                    </div>
                    
                    <div class="space-y-2 mb-4">
                        <div class="flex justify-between text-sm">
                            <span class="text-gray-600">Price per kWh:</span>
                            <span class="font-medium">${pricePerKWh.toFixed(6)} ETH</span>
                        </div>
                        <div class="flex justify-between text-sm">
                            <span class="text-gray-600">Total Cost:</span>
                            <span class="font-semibold text-blue-600">${totalCost.toFixed(6)} ETH</span>
                        </div>
                        <div class="flex justify-between text-sm">
                            <span class="text-gray-600">Listed:</span>
                            <span>${new Date(Number(listing.timestamp) * 1000).toLocaleDateString()}</span>
                        </div>
                    </div>
                    
                    ${isOwnListing ? 
                        '<button disabled class="w-full bg-gray-300 text-gray-500 py-2 px-4 rounded-lg cursor-not-allowed">Your Listing</button>' :
                        `<button onclick="buyEnergy(${listing.id}, '${(BigInt(listing.amount) * BigInt(listing.pricePerKWh) / BigInt(10**18)).toString()}')" 
                                class="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors">
                            <i class="fas fa-shopping-cart mr-2"></i>Buy Energy
                        </button>`
                    }
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading marketplace:', error);
        document.getElementById('energyListings').innerHTML = `
            <div class="col-span-full text-center py-12">
                <i class="fas fa-exclamation-triangle text-6xl text-red-300 mb-4"></i>
                <p class="text-xl text-red-500">Error loading marketplace</p>
                <p class="text-red-400">${error.message}</p>
            </div>
        `;
    }
}

// Load user's own listings
async function loadMyListings() {
    if (!contract || !userAddress) return;
    
    try {
        const listings = await contract.getUserListings(userAddress);
        const listingsContainer = document.getElementById('myEnergyListings');
        
        if (listings.length === 0) {
            listingsContainer.innerHTML = `
                <div class="text-center py-12">
                    <i class="fas fa-list text-6xl text-gray-300 mb-4"></i>
                    <p class="text-xl text-gray-500">No active listings</p>
                    <p class="text-gray-400">Create your first energy listing!</p>
                </div>
            `;
            return;
        }
        
        listingsContainer.innerHTML = listings.map(listing => {
            const amount = parseFloat(ethers.formatEther(listing.amount));
            const pricePerKWh = parseFloat(ethers.formatEther(listing.pricePerKWh));
            const totalValue = amount * pricePerKWh;
            
            return `
                <div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div class="flex justify-between items-center">
                        <div class="flex-1">
                            <div class="flex items-center space-x-4">
                                <div>
                                    <p class="font-semibold text-lg">${amount.toFixed(2)} kWh</p>
                                    <p class="text-sm text-gray-600">Listed on ${new Date(Number(listing.timestamp) * 1000).toLocaleDateString()}</p>
                                </div>
                                <div>
                                    <p class="text-sm text-gray-600">Price per kWh</p>
                                    <p class="font-medium">${pricePerKWh.toFixed(6)} ETH</p>
                                </div>
                                <div>
                                    <p class="text-sm text-gray-600">Total Value</p>
                                    <p class="font-medium text-green-600">${totalValue.toFixed(6)} ETH</p>
                                </div>
                            </div>
                        </div>
                        <div class="flex items-center space-x-2">
                            <span class="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                                Active
                            </span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading user listings:', error);
        document.getElementById('myEnergyListings').innerHTML = `
            <div class="text-center py-12">
                <i class="fas fa-exclamation-triangle text-6xl text-red-300 mb-4"></i>
                <p class="text-xl text-red-500">Error loading your listings</p>
                <p class="text-red-400">${error.message}</p>
            </div>
        `;
    }
}

// Load transaction history
async function loadTransactionHistory() {
    if (!contract || !userAddress) return;
    
    try {
        const transactions = await contract.getTransactionHistory(userAddress);
        const historyContainer = document.getElementById('transactionHistory');
        
        if (transactions.length === 0) {
            historyContainer.innerHTML = `
                <tr>
                    <td colspan="6" class="px-6 py-12 text-center">
                        <i class="fas fa-history text-6xl text-gray-300 mb-4"></i>
                        <p class="text-xl text-gray-500">No transaction history</p>
                        <p class="text-gray-400">Your transactions will appear here</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        historyContainer.innerHTML = transactions.map(tx => {
            const amount = parseFloat(ethers.formatEther(tx.amount));
            const pricePerKWh = parseFloat(ethers.formatEther(tx.pricePerKWh));
            const totalCost = parseFloat(ethers.formatEther(tx.totalCost));
            const date = new Date(Number(tx.timestamp) * 1000);
            
            const counterparty = tx.transactionType === 'BUY' ? tx.producer : tx.consumer;
            const typeColor = tx.transactionType === 'BUY' ? 'text-blue-600' : 'text-green-600';
            const typeIcon = tx.transactionType === 'BUY' ? 'fa-shopping-cart' : 'fa-tag';
            
            return `
                <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${date.toLocaleDateString()} ${date.toLocaleTimeString()}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="${typeColor} font-medium">
                            <i class="fas ${typeIcon} mr-1"></i>${tx.transactionType}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${amount.toFixed(2)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${pricePerKWh.toFixed(6)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ${tx.transactionType === 'SELL' ? '-' : totalCost.toFixed(6)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${counterparty === '0x0000000000000000000000000000000000000000' ? 
                            'Pending' : 
                            `${counterparty.substring(0, 8)}...${counterparty.substring(34)}`
                        }
                    </td>
                </tr>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading transaction history:', error);
        document.getElementById('transactionHistory').innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-12 text-center">
                    <i class="fas fa-exclamation-triangle text-6xl text-red-300 mb-4"></i>
                    <p class="text-xl text-red-500">Error loading transaction history</p>
                    <p class="text-red-400">${error.message}</p>
                </td>
            </tr>
        `;
    }
}

// Switch between tabs
function switchTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.add('hidden');
    });
    
    // Remove active state from all tab buttons
    document.querySelectorAll('.tab-button').forEach(button => {
        button.className = 'tab-button py-2 px-1 border-b-2 border-transparent font-medium text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300';
    });
    
    // Show selected tab content
    document.getElementById(tabName + 'Content').classList.remove('hidden');
    
    // Add active state to selected tab button
    const activeButton = document.getElementById(tabName + 'Tab');
    activeButton.className = 'tab-button py-2 px-1 border-b-2 border-blue-500 font-medium text-sm text-blue-600';
    
    // Load data for the selected tab
    switch(tabName) {
        case 'marketplace':
            loadMarketplace();
            break;
        case 'myListings':
            loadMyListings();
            break;
        case 'history':
            loadTransactionHistory();
            break;
    }
}

// Show/hide loading overlay
function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (show) {
        overlay.classList.remove('hidden');
    } else {
        overlay.classList.add('hidden');
    }
}

// Handle account changes
function handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
        // User disconnected
        updateConnectionStatus(false);
        userAddress = null;
        contract = null;
        signer = null;
        provider = null;
    } else {
        // User switched accounts
        connectWallet();
    }
}

// Handle chain changes
function handleChainChanged(chainId) {
    // Reload the page when chain changes
    window.location.reload();
}

// Utility function to format address
function formatAddress(address) {
    return `${address.substring(0, 6)}...${address.substring(38)}`;
} 
