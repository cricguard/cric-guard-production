import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import { analyzeBowling } from './services/api';
import {
  Activity, ShieldCheck, AlertTriangle, Upload,
  ChevronRight, RefreshCw, Home, Info, BarChart2
} from 'lucide-react';

// --- Sub-Component: Confidence Gauge ---
const ConfidenceGauge = ({ value, prediction }) => {
  const color = prediction === 'SAFE' ? '#10b981' : '#ef4444';
  const percentage = (value * 100).toFixed(0);

  return (
    <div style={{ ...styles.gaugeOuter, background: `conic-gradient(${color} ${value * 360}deg, #e5e7eb 0deg)` }}>
      <div style={styles.gaugeInner}>
        <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937' }}>{percentage}%</span>
        <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>CONFIDENCE</span>
      </div>
    </div>
  );
};

// --- Sub-Component: Loading Spinner ---
const LoadingSpinner = () => (
  <div style={styles.spinner}>
    <div style={styles.spinnerInner}></div>
  </div>
);

// --- Sub-Component: Error Modal ---
const ErrorModal = ({ isOpen, message, confidence, onClose }) => {
  if (!isOpen) return null;

  const confidencePercent = confidence ? (confidence * 100).toFixed(1) : 'N/A';

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalContent}>
        <div style={styles.errorHeader}>
          <AlertTriangle size={48} color="#ef4444" style={{ marginBottom: '15px' }} />
          <h2 style={{ color: '#991b1b', margin: '0 0 10px 0' }}>Analysis Failed</h2>
          <p style={{ color: '#6b7280', margin: '0', fontSize: '0.95rem' }}>Low confidence detection</p>
        </div>

        <div style={styles.confidenceBox}>
          <span style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#dc2626' }}>{confidencePercent}%</span>
          <span style={{ fontSize: '0.9rem', color: '#6b7280', marginLeft: '10px' }}>Confidence</span>
        </div>

        <div style={styles.errorMessage}>
          <p style={{ color: '#374151', lineHeight: '1.6', margin: 0 }}>
            {message}
          </p>
        </div>

        <div style={styles.suggestionsBox}>
          <h4 style={{ marginTop: 0, color: '#1f2937' }}>Tips for better results:</h4>
          <ul style={{ color: '#6b7280', paddingLeft: '20px', margin: '10px 0 0 0' }}>
            <li>Ensure the bowler is clearly visible in the frame</li>
            <li>Capture the delivery stride or release point</li>
            <li>Use good lighting and avoid shadows</li>
            <li>Fill most of the frame with the bowling action</li>
          </ul>
        </div>

        <button onClick={onClose} style={styles.closeBtn} className="close-btn">
          Try Another Image
        </button>
      </div>
    </div>
  );
};

function App() {
  // Navigation State
  const [screen, setScreen] = useState('home'); // 'home', 'upload', 'results'

  // Data State
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [fileType, setFileType] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showErrorModal, setShowErrorModal] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Handlers
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setFileType(selectedFile.type.startsWith('video') ? 'video' : 'image');
    setPreview(URL.createObjectURL(selectedFile));
  };

  const captureVideoFrame = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(new File([blob], "frame.jpg", { type: "image/jpeg" }));
      }, 'image/jpeg');
    });
  };

  const runAnalysis = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      let fileToAnalyze = file;

      if (fileType === 'video') {
        fileToAnalyze = await captureVideoFrame();
        if (!fileToAnalyze) {
          throw new Error('Could not capture a frame from the video.');
        }
      }

      const data = await analyzeBowling(fileToAnalyze);
      console.log('Backend result:', data);

      if (data.status === 'success') {
        setResult(data);
        setScreen('results');
      } else {
        throw new Error(data.message || 'Analysis could not be completed.');
      }
    } catch (err) {
      console.error('Analysis error:', err);
      setError({
        message: err.message || 'Analysis failed. Please make sure the backend is running and try again.',
        confidence: 0
      });
      setShowErrorModal(true);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const resetApp = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setScreen('home');
  };

  // --- SCREEN: HOME ---
  if (screen === 'home') {
    return (
      <div style={styles.container}>
        <div style={styles.heroSection}>
          <Activity size={60} color="white" style={{ marginBottom: '20px' }} />
          <h1 style={styles.heroTitle}>Cricket Injury Predictor <span style={styles.badge}>v2.0</span></h1>
          <p style={styles.heroSubtitle}>Biomechanical analysis for fast bowlers using Deep Learning and Pose Estimation.</p>
          <button onClick={() => setScreen('upload')} style={styles.primaryBtn} className="primary-btn">
            Get Started <ChevronRight size={20} />
          </button>
        </div>
      </div>
    );
  }

  // --- SCREEN: UPLOAD & ANALYSIS ---
  if (screen === 'upload') {
    return (
      <div style={styles.container}>
        <ErrorModal
          isOpen={showErrorModal}
          message={error?.message}
          confidence={error?.confidence}
          onClose={() => setShowErrorModal(false)}
        />
        <button onClick={() => setScreen('home')} style={styles.backBtn} className="back-btn"><Home size={18} /> Home</button>
        <div style={styles.mainGrid}>
          <section style={styles.card} className="card">
            <h3 style={styles.cardTitle}>1. Configure Analysis</h3>

            <div style={styles.infoBox}>
              <p style={styles.infoText}>Using the production Random Forest model for pose-based injury risk analysis.</p>
            </div>

            <div style={styles.dropzone} className="dropzone">
              <input type="file" onChange={handleFileChange} accept="image/*,video/*" id="hiddenInput" style={{ display: 'none' }} />
              <label htmlFor="hiddenInput" style={styles.uploadLabel} className="upload-label">
                <Upload size={32} color="#4b5563" />
                <p>{file ? file.name : "Click to upload image or video"}</p>
              </label>
            </div>

            {preview && (
              <div style={styles.previewBox}>
                {fileType === 'video' ? (
                  <video ref={videoRef} src={preview} controls style={styles.media} />
                ) : (
                  <img src={preview} alt="preview" style={styles.media} />
                )}
                {fileType === 'video' && <p style={styles.hint}>Pause on the delivery stride/release point</p>}
              </div>
            )}

            <button onClick={runAnalysis} disabled={!file || loading} style={styles.analyzeBtn} className="analyze-btn">
              {loading ? (
                <>
                  <LoadingSpinner /> AI Processing...
                </>
              ) : (
                "Execute Analysis"
              )}
            </button>
          </section>
        </div>
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
    );
  }

  // --- SCREEN: RESULTS ---
  if (screen === 'results') {
    const isSafe = result?.prediction === 'SAFE';

    return (
      <div style={styles.container}>
        <div style={styles.resultsHeader}>
          <h2>Analysis Report</h2>
          <button onClick={resetApp} style={styles.secondaryBtn} className="secondary-btn"><RefreshCw size={18} /> New Analysis</button>
        </div>

        <div style={styles.mainGrid}>
          <div style={styles.card}>
            <ConfidenceGauge value={result?.confidence ?? 0} prediction={result?.prediction ?? 'SAFE'} />
            <div style={{ ...styles.statusBanner, backgroundColor: isSafe ? '#ecfdf5' : '#fef2f2' }}>
              {isSafe ? <ShieldCheck color="#10b981" size={32} /> : <AlertTriangle color="#ef4444" size={32} />}
              <h1 style={{ color: isSafe ? '#065f46' : '#991b1b', margin: 0 }}>{result?.prediction ?? 'SAFE'}</h1>
            </div>

            <div style={styles.dataGrid}>
              <div style={styles.dataItem}><strong>Model Used:</strong> MoveNet + Random Forest</div>
              <div style={styles.dataItem}><strong>Feature Set:</strong> 57 Features</div>
              <div style={styles.dataItem}><strong>Pose Confidence:</strong> {((result?.mean_pose_confidence ?? 0) * 100).toFixed(1)}%</div>
              <div style={styles.dataItem}><strong>Decision Strength:</strong> {((result?.decision_strength ?? 0) * 100).toFixed(1)}%</div>
            </div>

            <div style={styles.feedbackBox}>
              <h4>Expert Feedback:</h4>
              {(result?.confidence ?? 0) > 0.70 ? (
                <p>{isSafe
                  ? "The bowling action shows optimal trunk alignment and front-foot stability. Injury risk is currently low."
                  : "Warning: High lateral trunk flexion or abnormal arm path detected. Suggest corrective coaching to prevent lumbar stress fractures."}
                </p>
              ) : (
                <p style={{ color: '#6b7280', fontStyle: 'italic' }}>
                  Analysis completed with moderate confidence. Results should be verified by a professional coach.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
}

// --- Styling ---
const styles = {
  container: {
    padding: '40px 20px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    minHeight: '100vh',
    fontFamily: "'Inter', sans-serif",
    transition: 'all 0.3s ease'
  },
  heroSection: {
    textAlign: 'center',
    marginTop: '10vh',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    borderRadius: '20px',
    padding: '40px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)'
  },
  heroTitle: {
    fontSize: '4rem',
    fontWeight: '900',
    color: 'white',
    marginBottom: '20px',
    textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
  },
  heroSubtitle: {
    fontSize: '1.5rem',
    color: 'rgba(255, 255, 255, 0.9)',
    maxWidth: '700px',
    margin: '0 auto 40px auto',
    lineHeight: '1.6'
  },
  badge: {
    fontSize: '1rem',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    color: '#10b981',
    padding: '6px 16px',
    borderRadius: '25px',
    verticalAlign: 'middle',
    border: '1px solid rgba(16, 185, 129, 0.3)'
  },
  primaryBtn: {
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: 'white',
    padding: '18px 36px',
    borderRadius: '15px',
    border: 'none',
    fontSize: '1.2rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '10px',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 6px 20px rgba(16, 185, 129, 0.4)'
    }
  },
  secondaryBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    padding: '12px 24px',
    borderRadius: '10px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: 'white',
    transition: 'all 0.3s ease',
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      transform: 'translateY(-1px)'
    }
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: 'rgba(255, 255, 255, 0.8)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    marginBottom: '20px',
    transition: 'color 0.3s ease',
    '&:hover': {
      color: 'white'
    }
  },
  mainGrid: {
    maxWidth: '900px',
    margin: '0 auto'
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: '35px',
    borderRadius: '25px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    transition: 'transform 0.3s ease',
    '&:hover': {
      transform: 'translateY(-5px)'
    }
  },
  cardTitle: {
    marginBottom: '25px',
    color: '#1f2937',
    fontSize: '1.5rem',
    fontWeight: '700'
  },
  label: {
    display: 'block',
    fontSize: '1rem',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '10px'
  },
  infoBox: {
    backgroundColor: '#ecfdf5',
    border: '1px solid #a7f3d0',
    borderRadius: '12px',
    padding: '14px 16px',
    marginBottom: '20px'
  },
  infoText: {
    margin: 0,
    color: '#065f46',
    fontWeight: '600'
  },
  dropzone: {
    border: '2px dashed #10b981',
    borderRadius: '15px',
    padding: '40px',
    textAlign: 'center',
    cursor: 'pointer',
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    transition: 'all 0.3s ease',
    '&:hover': {
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      borderColor: '#059669'
    }
  },
  uploadLabel: {
    cursor: 'pointer',
    color: '#4b5563',
    transition: 'color 0.3s ease',
    '&:hover': {
      color: '#10b981'
    }
  },
  previewBox: {
    marginTop: '25px',
    textAlign: 'center'
  },
  media: {
    width: '100%',
    borderRadius: '15px',
    maxHeight: '400px',
    objectFit: 'contain',
    backgroundColor: '#000',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
  },
  hint: {
    fontSize: '0.9rem',
    color: '#6b7280',
    marginTop: '12px',
    fontStyle: 'italic'
  },
  analyzeBtn: {
    width: '100%',
    padding: '18px',
    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '15px',
    fontSize: '1.2rem',
    fontWeight: 'bold',
    marginTop: '30px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 6px 20px rgba(245, 158, 11, 0.4)'
    },
    '&:disabled': {
      opacity: 0.6,
      cursor: 'not-allowed',
      transform: 'none'
    }
  },
  resultsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: '900px',
    margin: '0 auto 25px auto'
  },
  statusBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '20px',
    padding: '25px',
    borderRadius: '20px',
    marginBottom: '25px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
  },
  gaugeOuter: {
    width: '140px',
    height: '140px',
    borderRadius: '50%',
    margin: '0 auto 25px auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
  },
  gaugeInner: {
    width: '110px',
    height: '110px',
    backgroundColor: 'white',
    borderRadius: '50%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center'
  },
  dataGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '15px',
    marginBottom: '25px'
  },
  dataItem: {
    padding: '15px',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    fontSize: '0.95rem',
    border: '1px solid #e2e8f0'
  },
  feedbackBox: {
    borderTop: '1px solid #e5e7eb',
    paddingTop: '25px',
    marginTop: '15px',
    backgroundColor: '#f8fafc',
    padding: '20px',
    borderRadius: '12px',
    border: '1px solid #e2e8f0'
  },
  spinner: {
    display: 'inline-block',
    width: '20px',
    height: '20px',
    marginRight: '10px'
  },
  spinnerInner: {
    width: '100%',
    height: '100%',
    border: '2px solid #ffffff',
    borderTop: '2px solid transparent',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modalContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: '20px',
    padding: '40px',
    maxWidth: '500px',
    width: '90%',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    animation: 'slideIn 0.3s ease'
  },
  errorHeader: {
    textAlign: 'center',
    borderBottom: '2px solid #fee2e2',
    paddingBottom: '20px',
    marginBottom: '25px'
  },
  confidenceBox: {
    backgroundColor: '#fef2f2',
    border: '2px solid #fecaca',
    borderRadius: '15px',
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '25px'
  },
  errorMessage: {
    backgroundColor: '#f8fafc',
    padding: '15px',
    borderRadius: '12px',
    marginBottom: '20px',
    borderLeft: '4px solid #ef4444'
  },
  suggestionsBox: {
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    padding: '15px',
    borderRadius: '12px',
    marginBottom: '25px',
    border: '1px solid rgba(59, 130, 246, 0.1)'
  },
  closeBtn: {
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 6px 20px rgba(16, 185, 129, 0.4)'
    }
  }
};

export default App;