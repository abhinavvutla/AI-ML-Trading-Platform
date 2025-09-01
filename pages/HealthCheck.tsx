
import React, { useState } from 'react';
import { CheckCircle, XCircle, Loader, Server, KeyRound, Cloud, HelpCircle, AlertTriangle } from 'lucide-react';
import { pingBackend, checkEnvStatus, checkAlpacaStatus, checkGeminiStatus } from '../services/healthService';

type CheckStatus = 'idle' | 'running' | 'success' | 'error';

interface CheckResult {
    status: CheckStatus;
    message: string;
}

const initialCheckState: CheckResult = { status: 'idle', message: '' };

const StatusIndicator: React.FC<{ status: CheckStatus }> = ({ status }) => {
    switch (status) {
        case 'running':
            return <Loader className="w-5 h-5 text-accent animate-spin" />;
        case 'success':
            return <CheckCircle className="w-5 h-5 text-positive" />;
        case 'error':
            return <XCircle className="w-5 h-5 text-negative" />;
        default:
            return <HelpCircle className="w-5 h-5 text-text-secondary" />;
    }
};

const HealthCheck: React.FC = () => {
    const [isChecking, setIsChecking] = useState(false);
    const [backendPing, setBackendPing] = useState<CheckResult>(initialCheckState);
    const [envVars, setEnvVars] = useState<CheckResult>(initialCheckState);
    const [alpaca, setAlpaca] = useState<CheckResult>(initialCheckState);
    const [gemini, setGemini] = useState<CheckResult>(initialCheckState);

    const runChecks = async () => {
        setIsChecking(true);
        // Reset states
        setBackendPing({ status: 'running', message: 'Pinging server...' });
        setEnvVars(initialCheckState);
        setAlpaca(initialCheckState);
        setGemini(initialCheckState);

        // 1. Check backend connectivity
        const pingRes = await pingBackend();
        if (pingRes.success) {
            setBackendPing({ status: 'success', message: 'Backend server is responsive.' });

            // If backend is up, run other checks in parallel
            setEnvVars({ status: 'running', message: 'Checking for API keys...' });
            setAlpaca({ status: 'running', message: 'Connecting to Alpaca...' });
            setGemini({ status: 'running', message: 'Connecting to Google AI...' });

            const [envRes, alpacaRes, geminiRes] = await Promise.all([
                checkEnvStatus(),
                checkAlpacaStatus(),
                checkGeminiStatus()
            ]);

            // 2. Handle Env Var Check
            if (envRes.success && envRes.data) {
                const missingKeys = Object.entries(envRes.data)
                    .filter(([, found]) => !found)
                    .map(([key]) => key);
                if (missingKeys.length > 0) {
                    setEnvVars({ status: 'error', message: `Missing server environment variables: ${missingKeys.join(', ')}.` });
                } else {
                    setEnvVars({ status: 'success', message: 'All required API keys found on server.' });
                }
            } else {
                setEnvVars({ status: 'error', message: envRes.error?.message || 'Failed to check server environment.' });
            }

            // 3. Handle Alpaca Check
            if (alpacaRes.success) {
                setAlpaca({ status: 'success', message: 'Successfully connected to Alpaca.' });
            } else {
                setAlpaca({ status: 'error', message: alpacaRes.error?.message || 'Failed to connect to Alpaca.' });
            }

            // 4. Handle Gemini Check
            if (geminiRes.success) {
                setGemini({ status: 'success', message: 'Successfully connected to Google AI.' });
            } else {
                setGemini({ status: 'error', message: geminiRes.error?.message || 'Failed to connect to Google AI.' });
            }

        } else {
            setBackendPing({ status: 'error', message: 'Backend server is not reachable. Is the server running? Check terminal for errors.' });
            const skippedMessage = 'Skipped: This check depends on backend server connectivity.';
            setEnvVars({ status: 'error', message: skippedMessage });
            setAlpaca({ status: 'error', message: skippedMessage });
            setGemini({ status: 'error', message: skippedMessage });
        }

        setIsChecking(false);
    };

    const CheckRow: React.FC<{ icon: React.ReactNode, title: string, result: CheckResult, helpText: string }> = ({ icon, title, result, helpText }) => (
        <li className="flex items-start sm:items-center justify-between p-4 bg-primary rounded-lg border border-border-color">
            <div className="flex items-start sm:items-center">
                <div className="mr-4 text-accent flex-shrink-0">{icon}</div>
                <div>
                    <h3 className="font-semibold text-text-primary">{title}</h3>
                    <p className={`text-sm ${result.status === 'success' ? 'text-text-secondary' : result.status === 'error' ? 'text-negative' : 'text-text-secondary'}`}>
                        {result.message || helpText}
                    </p>
                </div>
            </div>
            <div className="ml-4 flex-shrink-0">
                <StatusIndicator status={result.status} />
            </div>
        </li>
    );
    
    const showTroubleshooting = backendPing.status === 'error';

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold">System Health Check</h1>
            <p className="text-text-secondary">
                This tool diagnoses connection issues between the user interface, the backend server, and external services.
                If you are experiencing issues, run these checks to identify the point of failure.
            </p>
            <div className="bg-secondary p-6 rounded-lg border border-border-color space-y-4">
                <button
                    onClick={runChecks}
                    disabled={isChecking}
                    className="w-full bg-accent hover:bg-accent-hover text-white font-bold py-3 px-4 rounded-lg disabled:bg-gray-500 flex items-center justify-center"
                >
                    {isChecking ? <Loader className="w-5 h-5 mr-2 animate-spin" /> : <Server className="w-5 h-5 mr-2" />}
                    Run System Checks
                </button>
                <ul className="space-y-3">
                    <CheckRow 
                        icon={<Server className="w-6 h-6" />}
                        title="Backend Server Connectivity"
                        result={backendPing}
                        helpText="Checks if the UI can communicate with the Node.js backend server."
                    />
                    <CheckRow 
                        icon={<KeyRound className="w-6 h-6" />}
                        title="Backend Environment Variables"
                        result={envVars}
                        helpText="Checks if the backend server has loaded the necessary API keys from its environment."
                    />
                    <CheckRow 
                        icon={<Cloud className="w-6 h-6" />}
                        title="Alpaca API Connection"
                        result={alpaca}
                        helpText="Checks if the backend can successfully authenticate with the Alpaca API."
                    />
                    <CheckRow 
                        icon={<Cloud className="w-6 h-6" />}
                        title="Google AI API Connection"
                        result={gemini}
                        helpText="Checks if the backend can successfully authenticate with the Google AI (Gemini) API."
                    />
                </ul>
            </div>
            {showTroubleshooting && (
                <div className="bg-red-900/30 border border-red-700 text-red-300 px-6 py-5 rounded-lg animate-fade-in">
                    <div className="flex items-start">
                        <AlertTriangle className="w-6 h-6 mr-4 flex-shrink-0 text-red-400 mt-1" />
                        <div>
                            <h3 className="font-bold text-lg mb-2">Troubleshooting: Backend Server Unreachable</h3>
                            <p className="mb-4 text-sm">The UI cannot communicate with the backend. This is the root cause of all failures. Please check the following common issues:</p>
                            
                            <div className="space-y-4">
                                <div className="flex items-start">
                                    <div className="flex items-center justify-center h-6 w-6 rounded-full bg-red-500 text-white font-bold text-sm mr-3 flex-shrink-0 mt-1">1</div>
                                    <div>
                                        <h4 className="font-semibold">Is the server running?</h4>
                                        <p className="text-sm text-red-200">The most common issue. In your terminal, run the following command from the project root:</p>
                                        <pre className="bg-primary p-2 mt-2 rounded-md text-xs text-white"><code>npm start</code></pre>
                                        <p className="text-sm text-red-200 mt-1">Leave this terminal window open while you use the app.</p>
                                    </div>
                                </div>

                                <div className="flex items-start">
                                    <div className="flex items-center justify-center h-6 w-6 rounded-full bg-red-500 text-white font-bold text-sm mr-3 flex-shrink-0 mt-1">2</div>
                                    <div>
                                        <h4 className="font-semibold">Did the server crash?</h4>
                                        <p className="text-sm text-red-200">Check the terminal where you ran `npm start`. If you see any errors (often in red text), it means the server has stopped. Common causes are missing or incorrect API keys in your `.env` file.</p>
                                    </div>
                                </div>
                                
                                <div className="flex items-start">
                                    <div className="flex items-center justify-center h-6 w-6 rounded-full bg-red-500 text-white font-bold text-sm mr-3 flex-shrink-0 mt-1">3</div>
                                    <div>
                                        <h4 className="font-semibold">Is there a firewall issue? (Cloud Deployments)</h4>
                                        <p className="text-sm text-red-200">If you have deployed this application to a cloud provider (e.g., Google Cloud, AWS), ensure you have configured the firewall rules to allow incoming TCP traffic on the server's port (default is `3001`).</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HealthCheck;
