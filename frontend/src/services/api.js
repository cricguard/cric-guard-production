import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

export const analyzeBowling = async (file) => {
    if (!file) {
        throw new Error('No image selected for analysis.');
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await axios.post(`${API_URL}/predict`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            },
            timeout: 120000
        });

        return response.data;
    } catch (error) {
        console.error('Backend Analysis Error:', error);

        if (error.response?.data?.detail) {
            throw new Error(error.response.data.detail);
        }

        if (error.request) {
            throw new Error('Cannot connect to the backend. Make sure FastAPI is running on port 8000.');
        }

        throw new Error('Failed to send analysis request.');
    }
};