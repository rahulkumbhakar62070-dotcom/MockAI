import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  User, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Loader2, 
  Sparkles, 
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Signup() {
  const { register } = useAuth();
  const navigate = useNavigate();

  // Form inputs state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  // Validate form inputs
  const validateForm = () => {
    const newErrors = {};
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    // 1. Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required.';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters.';
    } else if (formData.name.trim().length > 50) {
      newErrors.name = 'Name cannot exceed 50 characters.';
    }

    // 2. Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required.';
    } else if (formData.email.trim().length > 254) {
      newErrors.email = 'Email address is too long.';
    } else if (!emailRegex.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address.';
    }

    // 3. Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required.';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long.';
    } else if (formData.password.length > 128) {
      newErrors.password = 'Password cannot exceed 128 characters.';
    }

    // 4. Confirm Password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password.';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear inline error on change
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (serverError) {
      setServerError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await register(
        formData.name.trim(),
        formData.email.trim(),
        formData.password
      );

      toast.success(response.message || 'Account created successfully! Please sign in.');
      navigate('/login');
    } catch (err) {
      const message =
        (Array.isArray(err.errors) && err.errors.length > 0)
          ? err.errors.join(' ')
          : err.message || 'Registration failed. Please try again.';
      setServerError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-160px)] flex items-center justify-center px-4 py-12 bg-[#F8F6F0]">
      <div className="relative w-full max-w-md">
        
        {/* Card Header */}
        <div className="text-center mb-8 space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#245C46] text-white shadow-sm mb-2">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-[#252923] tracking-tight">
            Create Your Account
          </h1>
          <p className="text-xs sm:text-sm text-[#777970]">
            Start mastering engineering interviews with AI assistance
          </p>
        </div>

        {/* Main Card */}
        <div className="editorial-card p-5 sm:p-8 space-y-6">
          
          {/* Server Error Alert Banner */}
          {serverError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            
            {/* Full Name Field */}
            <div className="space-y-1.5">
              <label 
                htmlFor="name" 
                className="block text-xs font-semibold text-[#252923] uppercase tracking-wider font-display"
              >
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#777970]">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  disabled={isSubmitting}
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Rahul Sharma"
                  className={`input-field pl-10 ${errors.name ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/15' : ''} ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                />
              </div>
              {errors.name && (
                <p className="text-[11px] text-rose-600 flex items-center gap-1 pt-0.5 font-medium">
                  <AlertCircle className="w-3 h-3" />
                  <span>{errors.name}</span>
                </p>
              )}
            </div>

            {/* Email Field */}
            <div className="space-y-1.5">
              <label 
                htmlFor="email" 
                className="block text-xs font-semibold text-[#252923] uppercase tracking-wider font-display"
              >
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#777970]">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  disabled={isSubmitting}
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="name@example.com"
                  className={`input-field pl-10 ${errors.email ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/15' : ''} ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                />
              </div>
              {errors.email && (
                <p className="text-[11px] text-rose-600 flex items-center gap-1 pt-0.5 font-medium">
                  <AlertCircle className="w-3 h-3" />
                  <span>{errors.email}</span>
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label 
                htmlFor="password" 
                className="block text-xs font-semibold text-[#252923] uppercase tracking-wider font-display"
              >
                Password (min 8 chars)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#777970]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  disabled={isSubmitting}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="At least 8 characters"
                  className={`input-field pl-10 pr-12 ${errors.password ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/15' : ''} ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                />
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 px-3.5 flex items-center justify-center min-w-[44px] min-h-[44px] text-[#777970] hover:text-[#252923] focus:outline-none cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-[11px] text-rose-600 flex items-center gap-1 pt-0.5 font-medium">
                  <AlertCircle className="w-3 h-3" />
                  <span>{errors.password}</span>
                </p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-1.5">
              <label 
                htmlFor="confirmPassword" 
                className="block text-xs font-semibold text-[#252923] uppercase tracking-wider font-display"
              >
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#777970]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  disabled={isSubmitting}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Repeat your password"
                  className={`input-field pl-10 pr-10 ${errors.confirmPassword ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/15' : ''} ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                />
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#777970] hover:text-[#252923] focus:outline-none"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-[11px] text-rose-600 flex items-center gap-1 pt-0.5 font-medium">
                  <AlertCircle className="w-3 h-3" />
                  <span>{errors.confirmPassword}</span>
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-forest w-full py-3 mt-2 text-sm font-semibold flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

          </form>

          {/* Footer Card Switch */}
          <div className="pt-4 border-t border-[#E8E4DA] text-center text-xs text-[#777970]">
            <span>Already have an account? </span>
            <Link
              to="/login"
              className="text-[#245C46] hover:underline font-semibold transition-colors"
            >
              Sign In
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
