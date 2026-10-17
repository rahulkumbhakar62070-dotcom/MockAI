import { useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useMediaDevices } from '../hooks/useMediaDevices';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RotateCcw,
  ArrowRight,
  ChevronLeft,
  Sparkles,
  Info,
  Lock,
  Volume2,
} from 'lucide-react';

export default function DeviceSetup() {
  const { id: paramSessionId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const sessionId = paramSessionId || searchParams.get('sessionId');

  // Device management hook
  const {
    stream,
    cameraStatus,
    micStatus,
    isCameraEnabled,
    isMicMuted,
    deviceLabels,
    errorMessage,
    audioLevel,
    isSupported,
    isSecureOrigin,
    startSetup,
    toggleCamera,
    toggleMic,
    stopAllTracks,
  } = useMediaDevices();

  const videoElementRef = useRef(null);

  // Attach active MediaStream to the video element whenever stream changes
  useEffect(() => {
    if (videoElementRef.current && stream) {
      videoElementRef.current.srcObject = stream;
    }
  }, [stream]);

  // Handle proceed to interview
  const handleProceed = () => {
    if (sessionId) {
      // Keep stream active so candidate enters interview room seamlessly
      navigate(`/interview/session/${sessionId}`);
    } else {
      // Standalone test: release tracks
      stopAllTracks();
      navigate('/interview/setup');
    }
  };

  // Helper: Status badge rendering
  const renderStatusBadge = (status, type) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-[#DCE8DC] text-[#245C46] border border-[#245C46]/20">
            <span className="w-2 h-2 rounded-full bg-[#245C46] animate-pulse"></span>
            <span>{type === 'video' ? 'Camera Active' : 'Microphone Active'}</span>
          </span>
        );
      case 'disabled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <VideoOff className="w-3.5 h-3.5 text-amber-700" />
            <span>Camera Off</span>
          </span>
        );
      case 'muted':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <MicOff className="w-3.5 h-3.5 text-amber-700" />
            <span>Mic Muted</span>
          </span>
        );
      case 'requesting':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-neutral-100 text-[#777970] border border-neutral-200">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
            <span>Requesting Permission...</span>
          </span>
        );
      case 'denied':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>Permission Denied</span>
          </span>
        );
      case 'not_found':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>Not Detected</span>
          </span>
        );
      case 'in_use':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
            <span>In Use By Other App</span>
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>Hardware Error</span>
          </span>
        );
      case 'idle':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-[#F8F6F0] text-[#777970] border border-[#E8E4DA]">
            <span>Not Checked</span>
          </span>
        );
    }
  };

  const isDeviceReady = (cameraStatus === 'active' || cameraStatus === 'disabled') &&
                        (micStatus === 'active' || micStatus === 'muted');

  const hasHardwareError = cameraStatus === 'denied' || cameraStatus === 'not_found' ||
                           micStatus === 'denied' || micStatus === 'not_found' ||
                           cameraStatus === 'in_use' || micStatus === 'in_use' ||
                           errorMessage.length > 0;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      
      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between text-xs text-[#777970]">
        <div className="flex items-center gap-2">
          <Link to="/dashboard" className="hover:text-[#245C46] flex items-center gap-1 transition-colors">
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </Link>
          <span>/</span>
          {sessionId ? (
            <Link to={`/interview/session/${sessionId}`} className="hover:text-[#245C46] transition-colors">
              Session
            </Link>
          ) : (
            <Link to="/interview/setup" className="hover:text-[#245C46] transition-colors">
              Interview Setup
            </Link>
          )}
          <span>/</span>
          <span className="text-[#252923] font-medium">Camera & Mic Setup</span>
        </div>

        <Link
          to={sessionId ? `/interview/session/${sessionId}` : '/interview/setup'}
          className="text-xs font-semibold text-[#245C46] hover:underline flex items-center gap-1"
        >
          <span>Skip to Text Mode</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Hero Header Banner */}
      <div className="editorial-card p-6 sm:p-7 bg-white space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#245C46] font-display uppercase tracking-wider">
          <Sparkles className="w-4 h-4" />
          <span>Hardware & Environment Check</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-[#252923]">
          Camera & Microphone Setup
        </h1>
        <p className="text-xs sm:text-sm text-[#777970] max-w-2xl leading-relaxed">
          Verify that your webcam and microphone are working properly before entering the mock interview. Click the button below to test your hardware locally.
        </p>

        {/* Local Privacy Reassurance Alert */}
        <div className="p-3.5 rounded-xl bg-[#F0F5F2] border border-[#245C46]/20 flex items-start gap-2.5 text-xs text-[#245C46]">
          <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-[#245C46]" />
          <p className="leading-relaxed">
            <strong className="font-semibold">Privacy First:</strong> Audio and video testing is conducted strictly in your local browser memory. No media is recorded, saved, or uploaded to any server or AI service in this step.
          </p>
        </div>
      </div>

      {/* Main Grid: Left (Video Preview Card) & Right (Status & Device Controls) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Live Camera Preview Container (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="editorial-card overflow-hidden bg-[#1E231F] text-white relative shadow-md">
            
            {/* 16:9 Aspect Ratio Frame */}
            <div className="relative aspect-video w-full bg-[#181C19] flex items-center justify-center overflow-hidden">
              
              {/* Active Video Element */}
              {stream && isCameraEnabled ? (
                <video
                  ref={videoElementRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />
              ) : (
                /* Camera Disabled or Uninitialized Placeholder */
                <div className="text-center p-6 space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-white/10 text-white/70 mx-auto flex items-center justify-center border border-white/15">
                    {cameraStatus === 'disabled' ? (
                      <VideoOff className="w-8 h-8 text-amber-300" />
                    ) : (
                      <Video className="w-8 h-8 text-white/60" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-display font-bold text-white">
                      {cameraStatus === 'disabled'
                        ? 'Camera is Turned Off'
                        : cameraStatus === 'denied'
                        ? 'Camera Permission Blocked'
                        : cameraStatus === 'not_found'
                        ? 'No Camera Hardware Detected'
                        : 'Webcam Preview Inactive'}
                    </p>
                    <p className="text-xs text-white/60 max-w-xs mx-auto">
                      {cameraStatus === 'disabled'
                        ? 'Click the "Turn On Camera" button below to re-enable your video stream.'
                        : cameraStatus === 'idle'
                        ? 'Click "Start Device Check" to grant permission and activate your preview.'
                        : 'Review error diagnostics on the right to resolve.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Floating Top Badge: Live indicator */}
              {stream && isCameraEnabled && (
                <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-mono text-emerald-300 flex items-center gap-1.5 border border-white/10">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>LIVE PREVIEW</span>
                </div>
              )}

              {/* Floating Bottom Overlay: Live Audio Level Bar */}
              {stream && (
                <div className="absolute bottom-3 left-3 right-3 bg-black/60 backdrop-blur-md p-2.5 rounded-xl border border-white/10 flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs font-mono text-white/80 shrink-0">
                    {isMicMuted ? (
                      <MicOff className="w-3.5 h-3.5 text-rose-400" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                    <span>{isMicMuted ? 'Muted' : 'Mic Input:'}</span>
                  </div>

                  {/* Volume Level Meter Bar */}
                  <div className="flex-1 bg-white/20 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-100 ${
                        isMicMuted ? 'bg-transparent' : audioLevel > 70 ? 'bg-amber-400' : 'bg-emerald-400'
                      }`}
                      style={{ width: `${isMicMuted ? 0 : audioLevel}%` }}
                    ></div>
                  </div>

                  <span className="text-[11px] font-mono text-white/60 shrink-0 w-8 text-right">
                    {isMicMuted ? '0%' : `${audioLevel}%`}
                  </span>
                </div>
              )}

            </div>

            {/* Media Controls Toolbar */}
            <div className="p-4 bg-[#252923] border-t border-white/10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                
                {/* Camera Toggle Button */}
                <button
                  type="button"
                  id="toggle-camera-btn"
                  onClick={toggleCamera}
                  disabled={!stream}
                  className={`px-3.5 py-2 rounded-xl text-xs font-medium inline-flex items-center gap-2 transition-all cursor-pointer ${
                    !stream
                      ? 'bg-white/5 text-white/30 cursor-not-allowed'
                      : isCameraEnabled
                      ? 'bg-white/10 hover:bg-white/20 text-white'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                  title={isCameraEnabled ? 'Turn off camera' : 'Turn on camera'}
                >
                  {isCameraEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                  <span>{isCameraEnabled ? 'Turn Off Camera' : 'Turn On Camera'}</span>
                </button>

                {/* Microphone Toggle Button */}
                <button
                  type="button"
                  id="toggle-mic-btn"
                  onClick={toggleMic}
                  disabled={!stream}
                  className={`px-3.5 py-2 rounded-xl text-xs font-medium inline-flex items-center gap-2 transition-all cursor-pointer ${
                    !stream
                      ? 'bg-white/5 text-white/30 cursor-not-allowed'
                      : !isMicMuted
                      ? 'bg-white/10 hover:bg-white/20 text-white'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}
                  title={isMicMuted ? 'Unmute microphone' : 'Mute microphone'}
                >
                  {!isMicMuted ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                  <span>{!isMicMuted ? 'Mute Mic' : 'Unmute Mic'}</span>
                </button>

              </div>

              {/* Retry / Refresh Stream Button */}
              {stream && (
                <button
                  type="button"
                  id="retry-devices-btn"
                  onClick={startSetup}
                  className="px-3 py-2 rounded-xl text-xs font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors inline-flex items-center gap-1.5"
                  title="Re-initialize devices"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restart Stream</span>
                </button>
              )}
            </div>

          </div>

          <p className="text-[11px] text-[#777970] text-center">
            Tip: Adjust your room lighting so your face is clearly visible, and speak a test phrase to check the audio volume bar.
          </p>
        </div>

        {/* Right Column: Diagnostics, Status & Action Controls (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Hardware Diagnostics Card */}
          <div className="editorial-card p-6 bg-white space-y-5">
            <h3 className="text-base font-display font-bold text-[#252923] flex items-center justify-between">
              <span>Device Diagnostics</span>
              <span className="text-[11px] font-mono text-[#777970] font-normal">
                WebRTC MediaDevices
              </span>
            </h3>

            {/* Camera Diagnostics Row */}
            <div className="p-4 rounded-xl bg-[#F8F6F0] border border-[#E8E4DA] space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-display font-bold text-[#252923]">
                  <Video className="w-4 h-4 text-[#245C46]" />
                  <span>Web Camera</span>
                </div>
                {renderStatusBadge(cameraStatus, 'video')}
              </div>
              <p className="text-xs text-[#777970] truncate font-mono">
                {deviceLabels.video || 'Not detected yet'}
              </p>
            </div>

            {/* Microphone Diagnostics Row */}
            <div className="p-4 rounded-xl bg-[#F8F6F0] border border-[#E8E4DA] space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-display font-bold text-[#252923]">
                  <Mic className="w-4 h-4 text-[#245C46]" />
                  <span>Microphone</span>
                </div>
                {renderStatusBadge(micStatus, 'audio')}
              </div>
              <p className="text-xs text-[#777970] truncate font-mono">
                {deviceLabels.audio || 'Not detected yet'}
              </p>
            </div>

            {/* Error Message Alert (if any) */}
            {hasHardwareError && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-2 text-xs text-rose-800">
                <div className="flex items-center gap-1.5 font-bold text-rose-900">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Setup Alert</span>
                </div>
                <p className="leading-relaxed">
                  {errorMessage || 'One or more media devices encountered an error or permission restriction.'}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 space-y-3">
              {cameraStatus === 'idle' && micStatus === 'idle' ? (
                /* Initial State: Candidate must click explicitly */
                <button
                  type="button"
                  id="start-device-check-btn"
                  onClick={startSetup}
                  className="btn-forest text-xs w-full py-3 flex items-center justify-center gap-2 font-semibold shadow-sm"
                >
                  <Video className="w-4 h-4" />
                  <span>Start Device Check</span>
                </button>
              ) : hasHardwareError || !isDeviceReady ? (
                /* Error State or Incomplete: Retry button */
                <div className="space-y-2">
                  <button
                    type="button"
                    id="retry-check-btn"
                    onClick={startSetup}
                    className="btn-forest text-xs w-full py-3 flex items-center justify-center gap-2 font-semibold shadow-sm"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Retry Device Detection</span>
                  </button>
                  <Link
                    to={sessionId ? `/interview/session/${sessionId}` : '/interview/setup'}
                    className="btn-secondary text-xs w-full py-2.5 flex items-center justify-center gap-1.5"
                  >
                    <span>Continue with Text Interview Instead</span>
                  </Link>
                </div>
              ) : (
                /* Ready State: Proceed to interview */
                <div className="space-y-2">
                  <button
                    type="button"
                    id="proceed-interview-btn"
                    onClick={handleProceed}
                    className="btn-forest text-xs w-full py-3 flex items-center justify-center gap-2 font-semibold shadow-sm"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                    <span>Devices Ready — Enter Interview</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={startSetup}
                    className="btn-secondary text-xs w-full py-2.5 flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Re-test Devices</span>
                  </button>
                </div>
              )}
            </div>

          </div>

          {/* Browser Security & Permissions Guide Card */}
          <div className="editorial-card p-5 bg-white space-y-3 text-xs text-[#777970]">
            <div className="flex items-center gap-2 font-display font-bold text-[#252923]">
              <Lock className="w-4 h-4 text-[#245C46]" />
              <span>Browser Permission Guidelines</span>
            </div>
            
            <ul className="space-y-2 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-[#245C46] font-bold mt-0.5">•</span>
                <span>
                  <strong>Secure Context:</strong> Browsers require <code className="font-mono text-[11px] bg-[#F8F6F0] px-1 py-0.5 rounded border border-[#E8E4DA]">https://</code> or <code className="font-mono text-[11px] bg-[#F8F6F0] px-1 py-0.5 rounded border border-[#E8E4DA]">http://localhost</code> to access camera and microphone hardware.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#245C46] font-bold mt-0.5">•</span>
                <span>
                  <strong>Blocked Permissions:</strong> If your browser previously blocked permissions, click the lock or camera icon next to the URL in your address bar, switch Camera and Microphone to <em>"Allow"</em>, and click Retry.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#245C46] font-bold mt-0.5">•</span>
                <span>
                  <strong>Other Apps:</strong> Ensure Zoom, Microsoft Teams, or other browser windows are not locking your webcam.
                </span>
              </li>
            </ul>

            <div className="pt-2 border-t border-[#E8E4DA] flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-1">
                <Info className="w-3 h-3 text-[#245C46]" />
                <span>MediaDevices Supported: {isSupported ? 'Yes' : 'No'}</span>
              </span>
              <span>Secure Origin: {isSecureOrigin ? 'Yes' : 'Insecure'}</span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
