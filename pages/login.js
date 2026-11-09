import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import TreeLoader from '../components/TreeLoader';

export default function Login() {
  const router = useRouter();

  const [mode, setMode] = useState('register');
  const [step, setStep] = useState(1);

  // Registration details
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [resetToken, setResetToken] = useState('');

  // Authentication details
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [registrationToken, setRegistrationToken] = useState('');

  // UI states
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('error');
  const [showPassword, setShowPassword] = useState(false);

  const notify = (text, type = 'error') => {
    setMessage(text);
    setMessageType(type);
  };

  const validEmail = value =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const validPhone = value =>
    /^[6-9]\d{9}$/.test(value);

  const switchMode = newMode => {
    setMode(newMode);
    setStep(1);
    setOtp('');
    setPassword('');
    setConfirmPassword('');
    setRegistrationToken('');
    setMessage('');
    setResetToken('');
  };
// SEND PASSWORD RESET OTP
const sendResetOtp = async () => {
  if (!validPhone(phone)) {
    return notify('Enter your registered 10-digit WhatsApp number.');
  }

  setLoading(true);
  setMessage('');

  try {
    const response = await fetch('/api/send-reset-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone })
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Unable to send OTP.');
    }

    setStep(2);
    notify('Password reset OTP sent to WhatsApp.', 'success');
  } catch (error) {
    notify(error.message);
  } finally {
    setLoading(false);
  }
};

// VERIFY PASSWORD RESET OTP
const verifyResetOtp = async () => {
  if (!/^\d{6}$/.test(otp)) {
    return notify('Enter the 6-digit OTP.');
  }

  setLoading(true);
  setMessage('');

  try {
    const response = await fetch('/api/verify-reset-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, otp })
    });

    const result = await response.json();

    if (!response.ok || !result.success || !result.resetToken) {
      throw new Error(result.message || 'OTP verification failed.');
    }

    setResetToken(result.resetToken);
    setStep(3);
    notify('OTP verified. Create your new password.', 'success');
  } catch (error) {
    notify(error.message);
  } finally {
    setLoading(false);
  }
};

// SAVE NEW PASSWORD
const resetPassword = async () => {
  if (password.length < 8) {
    return notify('Password must contain at least 8 characters.');
  }

  if (password !== confirmPassword) {
    return notify('Passwords do not match.');
  }

  if (!resetToken) {
    return notify('Please verify OTP again.');
  }

  setLoading(true);
  setMessage('');

  try {
    const response = await fetch('/api/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone,
        resetToken,
        newPassword: password
      })
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Password reset failed.');
    }

    setPassword('');
    setConfirmPassword('');
    setOtp('');
    setResetToken('');
    setMode('login');
    setStep(1);

    notify('Password changed successfully. Login with your new password.', 'success');
  } catch (error) {
    notify(error.message);
  } finally {
    setLoading(false);
  }
};
  // =====================================
  // 1. SEND WHATSAPP OTP
  // =====================================
  const sendOtp = async () => {
    if (name.trim().length < 2) {
      return notify('Please enter your full name.');
    }

    if (!validEmail(email.trim())) {
      return notify('Please enter a valid email address.');
    }

    if (!validPhone(phone)) {
      return notify('Please enter a valid 10-digit WhatsApp number.');
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ phone })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to send OTP.');
      }

      setStep(2);
      notify('OTP sent successfully. Check your WhatsApp.', 'success');

    } catch (error) {
      notify(error.message || 'OTP sending failed.');
    } finally {
      setLoading(false);
    }
  };

  // =====================================
  // 2. VERIFY WHATSAPP OTP
  // =====================================
  const verifyOtp = async () => {
    if (!/^\d{6}$/.test(otp)) {
      return notify('Please enter the 6-digit OTP.');
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phone,
          otp
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'OTP verification failed.');
      }

      if (!data.registrationToken) {
        throw new Error('Registration token missing.');
      }

      setRegistrationToken(data.registrationToken);
      setStep(3);

      notify('WhatsApp number verified successfully!', 'success');

    } catch (error) {
      notify(error.message || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  // =====================================
  // 3. CREATE ACCOUNT
  // =====================================
  const createAccount = async () => {
    if (!registrationToken) {
      return notify('Please verify your WhatsApp number first.');
    }

    if (password.length < 8) {
      return notify('Password must contain at least 8 characters.');
    }

    if (password !== confirmPassword) {
      return notify('Passwords do not match.');
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/create-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone,
          password,
          registrationToken
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Account creation failed.');
      }

      // Automatically login after successful registration
      const { error: loginError } =
        await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password
        });

      if (loginError) {
        throw loginError;
      }

      // Every new registration goes to normal user home.
      // Admin role is assigned separately by the project owner.
      notify('Account created successfully!', 'success');
      router.replace('/');

    } catch (error) {
      notify(error.message || 'Account creation failed.');
    } finally {
      setLoading(false);
    }
  };

  // =====================================
  // 4. EXISTING USER LOGIN
  // =====================================
  const loginAccount = async () => {
    if (!validPhone(phone)) {
      return notify('Enter your registered 10-digit WhatsApp number.');
    }

    if (!password) {
      return notify('Please enter your password.');
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/login-with-phone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phone,
          password
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success || !result.session) {
        throw new Error(
          result.message || 'Incorrect phone number or password.'
        );
      }

      // Save Supabase session
      const { error: sessionError } =
        await supabase.auth.setSession({
          access_token: result.session.access_token,
          refresh_token: result.session.refresh_token
        });

      if (sessionError) {
        throw sessionError;
      }

      // Get logged-in user
      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError || !userData.user) {
        throw new Error('Unable to verify logged-in user.');
      }

      // Check user role
      const { data: profile, error: profileError } = await supabase
        .from('users_profile')
        .select('role')
        .eq('id', userData.user.id)
        .single();

      if (profileError || !profile) {
        throw new Error(
          'Unable to verify account role. ' +
          (profileError?.message || '')
        );
      }

      notify('Welcome back! Login successful.', 'success');

      if (profile.role === 'admin') {
        router.replace('/admin');
      } else {
        router.replace('/');
      }

    } catch (error) {
      notify(
        error.message === 'Invalid login credentials'
          ? 'Incorrect phone number or password.'
          : error.message || 'Unable to login.'
      );
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
  return (
    <TreeLoader
      message="Growing your TimberMart account..."
      fullScreen={true}
    />
  );
}

  // =====================================
  // PAGE DESIGN
  // =====================================
  return (
    <div className="min-h-screen bg-[#F1F4F1] flex justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden">

        {/* LOGO HEADER */}
        {/* TIMBERMART LOGO HEADER */}
<div className="bg-white text-center px-6 py-5 border-b border-gray-100">

  <div className="w-full flex justify-center items-center">
    <img
      src="/logo.png"
      alt="TimberMart - Buy Sell Grow Together"
      className="w-52 h-52 sm:w-60 sm:h-60 object-contain"
    />
  </div>

  <p className="text-[#183D32] text-[10px] font-bold tracking-[3px] mt-1">
    INDIA'S TIMBER MARKETPLACE
  </p>

</div>

        <div className="p-6 sm:p-8">

          {/* REGISTER / LOGIN TABS */}
          {step === 1 && (
            <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
              <button
                type="button"
                onClick={() => switchMode('register')}
                className={`flex-1 py-3 rounded-lg text-sm font-bold transition ${
                  mode === 'register'
                    ? 'bg-[#183D32] text-white'
                    : 'text-gray-500'
                }`}
              >
                Create Account
              </button>

              <button
                type="button"
                onClick={() => switchMode('login')}
                className={`flex-1 py-3 rounded-lg text-sm font-bold transition ${
                  mode === 'login'
                    ? 'bg-[#183D32] text-white'
                    : 'text-gray-500'
                }`}
              >
                Login
              </button>
            </div>
          )}

          {/* REGISTRATION SCREEN */}
          {mode === 'register' && step === 1 && (
            <>
              <h2 className="text-xl font-bold text-gray-900">
                Create Your Account
              </h2>

              <p className="text-xs text-gray-500 mt-2 mb-6">
                Join TimberMart and connect with the timber community.
              </p>

              {/* NAME */}
              <label className="block text-xs font-bold text-gray-700">
                Full Name *
              </label>

              <input
                type="text"
                autoComplete="name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full border border-gray-200 rounded-xl p-3 mt-2 mb-4 text-sm outline-none focus:border-[#183D32]"
              />

              {/* EMAIL */}
              <label className="block text-xs font-bold text-gray-700">
                Email Address *
              </label>

              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className="w-full border border-gray-200 rounded-xl p-3 mt-2 mb-4 text-sm outline-none focus:border-[#183D32]"
              />

              {/* PHONE */}
              <label className="block text-xs font-bold text-gray-700">
                WhatsApp Mobile Number *
              </label>

              <div className="flex gap-2 mt-2 mb-5">
                <div className="border border-gray-200 rounded-xl p-3 bg-gray-50 font-bold text-sm">
                  🇮🇳 +91
                </div>

                <input
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  value={phone}
                  onChange={e =>
                    setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))
                  }
                  placeholder="Enter mobile number"
                  className="flex-1 min-w-0 border border-gray-200 rounded-xl p-3 text-sm outline-none focus:border-[#183D32]"
                />
              </div>

              <button
                type="button"
                onClick={sendOtp}
                disabled={loading}
                className="w-full bg-[#183D32] hover:bg-[#245746] text-white rounded-xl py-4 font-bold text-sm disabled:opacity-50"
              >
                {loading ? 'Sending OTP...' : 'Send OTP on WhatsApp →'}
              </button>
            </>
          )}

          {/* OTP VERIFICATION SCREEN */}
          {mode === 'register' && step === 2 && (
            <>
              <div className="text-center mb-6">
                <div className="text-4xl mb-3">
                  💬
                </div>

                <h2 className="text-xl font-bold">
                  Verify Your WhatsApp
                </h2>

                <p className="text-xs text-gray-500 mt-2">
                  Enter the OTP sent to your WhatsApp number.
                </p>

                <p className="text-sm font-bold text-[#183D32] mt-3">
                  +91 {phone}
                </p>
              </div>

              <label className="block text-xs font-bold text-gray-700">
                Enter Verification Code
              </label>

              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={otp}
                onChange={e =>
                  setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))
                }
                placeholder="Enter 6-digit OTP"
                className="w-full border border-gray-200 rounded-xl p-4 mt-2 text-center text-xl tracking-[8px] outline-none focus:border-[#183D32]"
              />

              <button
                type="button"
                onClick={verifyOtp}
                disabled={loading}
                className="w-full bg-[#183D32] text-white rounded-xl py-4 font-bold mt-5 disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Verify OTP →'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setOtp('');
                  setRegistrationToken('');
                  notify('');
                }}
                className="w-full text-xs text-gray-500 mt-4"
              >
                Change Number
              </button>
            </>
          )}

          {/* PASSWORD CREATION SCREEN */}
          {mode === 'register' && step === 3 && (
            <>
              <div className="text-center mb-6">
                <div className="text-4xl mb-3">
                  🔐
                </div>

                <h2 className="text-xl font-bold">
                  Create Your Password
                </h2>

                <p className="text-xs text-gray-500 mt-2">
                  Your WhatsApp number has been verified.
                </p>
              </div>

              <label className="block text-xs font-bold text-gray-700">
                New Password
              </label>

              <div className="relative mt-2 mb-4">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full border border-gray-200 rounded-xl p-3 pr-16 text-sm outline-none focus:border-[#183D32]"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-xs text-gray-500"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>

              <label className="block text-xs font-bold text-gray-700">
                Confirm Password
              </label>

              <input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                className="w-full border border-gray-200 rounded-xl p-3 mt-2 text-sm outline-none focus:border-[#183D32]"
              />

              <p className="text-[10px] text-gray-400 mt-2">
                Password must contain at least 8 characters.
              </p>

              <button
                type="button"
                onClick={createAccount}
                disabled={loading}
                className="w-full bg-[#183D32] hover:bg-[#245746] text-white rounded-xl py-4 font-bold mt-6 disabled:opacity-50"
              >
                {loading ? 'Creating Account...' : 'Create Account →'}
              </button>
            </>
          )}

          {/* EXISTING USER LOGIN SCREEN */}
          {mode === 'login' && step === 1 && (
            <>
              <h2 className="text-xl font-bold text-gray-900">
                Welcome Back!
              </h2>

              <p className="text-xs text-gray-500 mt-2 mb-6">
                Login to your TimberMart account.
              </p>

              {/* PHONE */}
              <label className="block text-xs font-bold text-gray-700">
                WhatsApp Mobile Number
              </label>

              <div className="flex gap-2 mt-2 mb-5">
                <span className="border border-gray-200 rounded-xl p-3 bg-gray-50 font-bold text-sm">
                  🇮🇳 +91
                </span>

                <input
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  value={phone}
                  onChange={e =>
                    setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))
                  }
                  placeholder="Registered mobile number"
                  className="flex-1 min-w-0 border border-gray-200 rounded-xl p-3 text-sm outline-none focus:border-[#183D32]"
                />
              </div>

              {/* PASSWORD */}
              <label className="block text-xs font-bold text-gray-700">
                Password
              </label>

              <div className="relative mt-2">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full border border-gray-200 rounded-xl p-3 pr-16 text-sm outline-none focus:border-[#183D32]"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-xs text-gray-500"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>

              <button
                type="button"
                onClick={loginAccount}
                disabled={loading}
                className="w-full bg-[#183D32] hover:bg-[#245746] text-white rounded-xl py-4 font-bold mt-6 disabled:opacity-50"
              >
                {loading ? 'Logging in...' : 'Login →'}
              </button>
              <button
  type="button"
  onClick={() => {
    setMode('forgot');
    setStep(1);
    setOtp('');
    setPassword('');
    setConfirmPassword('');
    setResetToken('');
    setMessage('');
  }}
  className="w-full text-xs text-[#183D32] font-bold mt-4"
>
  Forgot Password?
</button>

              <button
                type="button"
                onClick={() => switchMode('register')}
                className="w-full text-xs text-[#183D32] font-bold mt-5"
              >
                New User? Create Account
              </button>
            </>
          )}
          {/* FORGOT PASSWORD - PHONE */}
{mode === 'forgot' && step === 1 && (
  <>
    <h2 className="text-xl font-bold">Reset Password</h2>

    <p className="text-xs text-gray-500 mt-2 mb-6">
      Enter your registered WhatsApp number to receive an OTP.
    </p>

    <label className="block text-xs font-bold text-gray-700">
      Registered Mobile Number
    </label>

    <div className="flex gap-2 mt-2 mb-5">
      <span className="border border-gray-200 rounded-xl p-3 bg-gray-50 font-bold text-sm">
        🇮🇳 +91
      </span>

      <input
        type="tel"
        inputMode="numeric"
        value={phone}
        onChange={e =>
          setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))
        }
        placeholder="Enter registered number"
        className="flex-1 min-w-0 border rounded-xl p-3 text-sm"
      />
    </div>

    <button
      type="button"
      onClick={sendResetOtp}
      disabled={loading}
      className="w-full bg-[#183D32] text-white rounded-xl py-4 font-bold"
    >
      {loading ? 'Sending OTP...' : 'Send Reset OTP →'}
    </button>
  </>
)}

{/* FORGOT PASSWORD - OTP */}
{mode === 'forgot' && step === 2 && (
  <>
    <h2 className="text-xl font-bold">Verify OTP</h2>

    <p className="text-xs text-gray-500 mt-2 mb-5">
      Enter OTP sent to WhatsApp number +91 {phone}.
    </p>

    <input
      type="text"
      inputMode="numeric"
      value={otp}
      onChange={e =>
        setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))
      }
      placeholder="Enter 6-digit OTP"
      className="w-full border rounded-xl p-4 text-center text-xl tracking-widest"
    />

    <button
      type="button"
      onClick={verifyResetOtp}
      disabled={loading}
      className="w-full bg-[#183D32] text-white rounded-xl py-4 font-bold mt-5"
    >
      {loading ? 'Verifying...' : 'Verify OTP →'}
    </button>
  </>
)}

{/* FORGOT PASSWORD - NEW PASSWORD */}
{mode === 'forgot' && step === 3 && (
  <>
    <h2 className="text-xl font-bold">Create New Password</h2>

    <p className="text-xs text-gray-500 mt-2 mb-5">
      Enter a new password for your TimberMart account.
    </p>

    <label className="block text-xs font-bold mb-2">
      New Password
    </label>

    <input
      type="password"
      value={password}
      onChange={e => setPassword(e.target.value)}
      placeholder="Minimum 8 characters"
      className="w-full border rounded-xl p-3 mb-4"
    />

    <label className="block text-xs font-bold mb-2">
      Confirm Password
    </label>

    <input
      type="password"
      value={confirmPassword}
      onChange={e => setConfirmPassword(e.target.value)}
      placeholder="Re-enter new password"
      className="w-full border rounded-xl p-3"
    />

    <button
      type="button"
      onClick={resetPassword}
      disabled={loading}
      className="w-full bg-[#183D32] text-white rounded-xl py-4 font-bold mt-6"
    >
      {loading ? 'Updating Password...' : 'Update Password →'}
    </button>
  </>
)}

          {/* SUCCESS / ERROR MESSAGE */}
          {message && (
            <div
              role="status"
              aria-live="polite"
              className={`mt-5 p-3 rounded-xl text-xs text-center font-medium ${
                messageType === 'success'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-600 border border-red-200'
              }`}
            >
              {message}
            </div>
          )}

          {/* FOOTER */}
          <div className="border-t border-gray-100 mt-6 pt-5 text-center">
            <p className="text-[10px] text-gray-400">
              🔒 Secure Account • WhatsApp Verified
            </p>

            <a
              href="/"
              className="inline-block text-xs text-[#183D32] font-bold mt-4"
            >
              ← Back to Home
            </a>
          </div>

        </div>
      </div>
    </div>
  );
}