import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://binul19-cric-guard-backend.hf.space";

export const analyzeBowling = async (file) => {
    if (!file) {
        throw new Error('No image selected for analysis.');
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await axios.post(`${API_BASE_URL}/predict`, formData, {
            timeout: 120000
        });

        return response.data;
    } catch (error) {
        console.error('Backend Analysis Error:', error);

        if (error.response) {
            const status = error.response.status;
            const message = error.response.data?.detail
                || (status === 503
                    ? 'The Hugging Face Space is currently unavailable (HTTP 503). Check its status and try again.'
                    : `The analysis service returned an error (HTTP ${status}).`);
            const analysisError = new Error(message);
            analysisError.kind = status === 422 ? 'detection' : status >= 500 ? 'service' : 'request';
            throw analysisError;
        }

        if (error.request) {
            const connectionError = new Error(
                'Could not reach the analysis service. Check the Hugging Face Space status and try again.'
            );
            connectionError.kind = 'connection';
            throw connectionError;
        }

        const requestError = new Error(error.message || 'The analysis request could not be sent.');
        requestError.kind = 'request';
        throw requestError;
    }
};