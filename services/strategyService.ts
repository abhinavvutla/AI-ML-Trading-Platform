import { BackendResponse } from '../types';
import { getInternal, postInternal } from './backendService';

export const startTrainingJob = async (config: {
    models: string[],
    symbols: string[],
    trainingPeriodYears: number,
    stopLossPercentage: number,
    indicators: string[],
    strategyObjective: string,
}): Promise<BackendResponse<{ jobId: string }>> => {
    return postInternal<{ jobId: string }>('/api/train-strategy', config);
};

export interface TrainingStatusResponse {
    status: 'pending' | 'completed' | 'failed';
    submittedAt: string;
    results: {
        optimizations: string[];
        stopLossFeedback: string;
        sharpeRatio: number;
        validationAccuracy: number;
        fitStatus: 'Good Fit' | 'Potential Overfitting' | 'Potential Underfitting';
    } | null;
    error?: string;
}

export const getTrainingStatus = async (jobId: string): Promise<BackendResponse<TrainingStatusResponse>> => {
    return getInternal<TrainingStatusResponse>(`/api/training-status/${jobId}`);
};