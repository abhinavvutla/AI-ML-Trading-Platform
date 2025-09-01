
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { verifyKeysAndFetchAccount } from '../services/brokerService';
import { CheckCircle, XCircle, ShieldAlert, Server, Zap, Wrench } from 'lucide-react';
import { Link } from 'react-router-dom';

const Configuration: React.FC = () => {
    const { setBrokerStatus, setAccount, brokerStatus } = useApp();
    const [statusMessage, setStatusMessage] = useState({ type: '', message: '' });
    const [isTestingConnection, setIsTestingConnection] = useState(false);
    
    const handleTestConnection = async () => {
        setIsTestingConnection(true);
        setBrokerStatus('connecting');
        setStatusMessage({ type: 'info', message: 'Attempting to connect via secure backend server...' });

        const result = await verifyKeysAndFetchAccount();
        
        if (result.success && result.data) {
            setBrokerStatus('connected');
            setAccount(result.data);
            setStatusMessage({ type: 'success', message: `Successfully connected! Account: ${result.data.account_number}, Portfolio Value: $${parseFloat(result.data.portfolio_value).toFixed(2)}` });
        } else {
            setBrokerStatus('error');
            setAccount(null);
            const errorMessage = result.error?.message.includes('fetch') 
                ? "Connection failed. Please ensure the backend server is running and its environment variables are correctly set. Use the Health Check tool for diagnostics."
                : result.error?.message || 'An unknown error occurred.';
            setStatusMessage({ type: 'error', message: errorMessage });
        }
        setIsTestingConnection(false);
    };

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold">Connection Configuration</h1>
            
            <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-lg flex items-start">
                <ShieldAlert className="w-8 h-8 mr-4 text-red-400 flex-shrink-0"/>
                <div>
                    <h3 className="font-bold">Enhanced Security Model</h3>
                    <p className="text-sm">
                        API keys are no longer entered or stored in the browser. They must be placed in a `.env` file or configured as environment variables on the backend server, which securely manages all communication with external services. This is a critical security best practice.
                    </p>
                </div>
            </div>
            
             <div className="bg-blue-900/30 border border-blue-700 text-blue-300 px-4 py-3 rounded-lg flex items-start">
                <Server className="w-8 h-8 mr-4 text-blue-400 flex-shrink-0"/>
                <div>
                    <h3 className="font-bold">Backend Server Required</h3>
                    <p className="text-sm">
                        This application operates with a client-server architecture. To connect to Alpaca, you must first run the backend server with the correct environment variables. Please see the **`instructions.md`** file for setup commands.
                    </p>
                </div>
            </div>


            <div className="bg-secondary p-6 rounded-lg border border-border-color space-y-6">
                <h2 className="text-xl font-semibold">Connect to Alpaca Paper Trading</h2>
                <p className="text-sm text-text-secondary">
                    Click the button below to instruct the backend server to connect to Alpaca using the secure credentials provided in its environment.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4">
                    <button
                        onClick={handleTestConnection}
                        disabled={isTestingConnection || brokerStatus === 'connected'}
                        className="flex-grow bg-accent hover:bg-accent-hover text-white font-bold py-3 px-4 rounded-lg disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                        {isTestingConnection ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div> : <Zap className="w-5 h-5 mr-2" />}
                        {brokerStatus === 'connected' ? 'Connected' : 'Connect to Broker'}
                    </button>
                     <Link
                        to="/health-check"
                        className="flex-shrink-0 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center transition-colors"
                    >
                        <Wrench className="w-5 h-5 mr-2" />
                        Run Health Check
                    </Link>
                </div>
            </div>
            
            {statusMessage.message && (
                <div className={`mt-4 p-4 rounded-lg flex items-start text-sm ${
                    statusMessage.type === 'success' ? 'bg-green-900/50 text-positive border border-green-700' :
                    statusMessage.type === 'error' ? 'bg-red-900/50 text-negative border border-red-700' :
                    'bg-blue-900/50 text-blue-300 border border-blue-700'
                }`}>
                    {statusMessage.type === 'success' ? <CheckCircle className="w-5 h-5 mr-3 flex-shrink-0" /> : <XCircle className="w-5 h-5 mr-3 flex-shrink-0" />}
                    <div>{statusMessage.message}</div>
                </div>
            )}
        </div>
    );
};

export default Configuration;