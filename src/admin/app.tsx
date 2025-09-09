import type { StrapiApp } from '@strapi/strapi/admin';
import { Register } from './components/Register';
import { Login } from './components/Login';
import { User } from '@strapi/icons';
const config = {
  translations: {
    "app.components.HomePage.welcome": "Welcome to Cobalt CMS",
    "app.components.LeftMenu.navbrand.title": "COBALT",
    "app.components.HomePage.welcome.by": "by Cobalt Team",
    "app.components.AuthPage.welcome": "Welcome to Cobalt CMS",
    "app.components.AuthPage.welcome.subtitle": "Log in to your Cobalt account",
    "Auth.form.welcome.title": 'Welcome to Cobalt CMS',
    "Auth.form.welcome.subtitle": 'A modern, open-source CMS for your projects.',
    "Auth.form.welcome.description": 'Cobalt CMS is a powerful and flexible content management system designed to help you build and manage your digital content with ease.',
    "Auth.form.email.placeholder": "Enter your email address",
    "Auth.form.register.subtitle": "Credentials are only used to authenticate in Cobalt CMS. All saved data will be stored in your database.",
    "Auth.form.firstname.label": "First Name",
    "Auth.form.lastname.label": "Last Name",
    "Auth.form.email.label": "Email Address",
    "Auth.form.password.hint": "Must be at least 8 characters, 1 uppercase, 1 lowercase & 1 number",
    "Auth.form.confirmPassword.label": "Confirm Password",
    "Auth.form.button.register": "Create Account",
    "Auth.form.button.login": "Login",
    "Auth.form.rememberMe.label": "Remember me",
    "Auth.link.signin.account": "Already have an account? Sign in",
    "Auth.link.forgot-password": "Forgot your password?",
    "Auth.form.register.news.label": "Keep me updated about new features & upcoming improvements (by doing this you accept the {terms} and the {policy}).",
    "Auth.privacy-policy-agreement.terms": "terms of service",
    "Auth.privacy-policy-agreement.policy": "privacy policy",
  },
  locales: [
    'en'
    // Uncomment other locales as needed
    // 'ar', 'fr', 'cs', 'de', 'dk', 'es', 'he', 'id', 'it', 'ja', 'ko', 'ms', 'nl', 'no', 'pl', 'pt-BR', 'pt', 'ru', 'sk', 'sv', 'th', 'tr', 'uk', 'vi', 'zh-Hans', 'zh',
  ],
  head: {
    title: 'COBALT',
    favicon: '/uploads/favicon_08e7ade248.png',
  },
};

/**
 * Improved auto-login script with better token management
 */
function injectAutoLoginScript(token: string, cmsToken?: string) {
  console.log('[AutoLogin] Starting with tokens:', { hasToken: !!token, hasCmsToken: !!cmsToken });

  const waitForDOM = () => {
    let attempts = 0;
    const maxAttempts = 100;

    const waitForFormElements = () => {
      attempts++;
      const forms = document.querySelectorAll('form');
      const inputs = document.querySelectorAll('input');
      const buttons = document.querySelectorAll('button');

      if (forms.length > 0 && inputs.length >= 2 && buttons.length > 0) {
        console.log('[AutoLogin] Form elements ready, executing...');
        executeAutoLogin();
      } else if (attempts >= maxAttempts) {
        console.error('[AutoLogin] Timeout waiting for form elements');
        if (cmsToken) {
          console.log('[AutoLogin] Using CMS token fallback redirect...');
          setCmsTokenAndRedirect(cmsToken);
        }
      } else {
        setTimeout(waitForFormElements, 100);
      }
    };
    waitForFormElements();
  };

  const executeAutoLogin = async () => {
    let notification: HTMLElement | null = null;

    try {
      console.log('[AutoLogin] Starting execution...');
      notification = createNotification('Processing auto-login...', 'info');
      document.body.appendChild(notification);

      if (cmsToken) {
        console.log('[AutoLogin] Using existing CMS token...');
        updateNotification(notification, 'Using existing CMS session...', 'success');

    setTimeout(() => {
          setCmsTokenAndRedirect(cmsToken);
        }, 1000);
        return;
      }

      const decoded = decodeJWT(token);
      if (!decoded) {
        throw new Error('Invalid token format');
      }

      if (!decoded.email || !decoded.passWord) {
        console.error('[AutoLogin] Missing credentials in token');
        throw new Error('Invalid token credentials');
      }

      if (!decoded.isCms && !decoded.isCMS && !decoded.is_cms) {
        throw new Error('User does not have CMS access');
      }

      const now = Math.floor(Date.now() / 1000);
      if (decoded.exp && decoded.exp < now) {
        throw new Error('Token expired');
      }

      fillLoginForm(decoded.email, decoded.passWord);
      updateNotification(notification, 'Submitting login...', 'info');

      setTimeout(async () => {
        await submitLoginForm(decoded, notification!);
      }, 1000);

    } catch (error) {
      console.error('[AutoLogin] Error:', error);
      if (notification) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        updateNotification(notification, `Auto-login failed: ${errorMessage}`, 'error');
      }
    }
  };

  const setCmsTokenAndRedirect = (cmsToken: string) => {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 30);

    document.cookie = `cmsJwtToken=${cmsToken}; expires=${expirationDate.toUTCString()}; path=/; SameSite=Lax`;
    document.cookie = `strapi_jwt=${cmsToken}; expires=${expirationDate.toUTCString()}; path=/; SameSite=Lax`;
    document.cookie = `strapi_session=${cmsToken}; expires=${expirationDate.toUTCString()}; path=/; SameSite=Lax`;
    document.cookie = `strapi_auth=${cmsToken}; expires=${expirationDate.toUTCString()}; path=/; SameSite=Lax`;

    console.log('[AutoLogin] CMS cookies set, redirecting...');

    setTimeout(() => {
      window.location.href = '/admin';
    }, 1000);
  };

  const submitLoginForm = async (decoded: any, notification: HTMLElement) => {
    try {
      const response = await fetch('/cms/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: decoded.email,
          password: decoded.passWord,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('[AutoLogin] Login successful');

        updateNotification(notification, 'Login successful! Redirecting...', 'success');

        if (result.jwt) {
          setCmsTokenAndRedirect(result.jwt);
        } else {
          setTimeout(() => {
            window.location.href = '/admin';
          }, 1500);
        }
      } else {
        throw new Error(`Login failed: ${response.status}`);
      }
    } catch (error) {
      console.error('[AutoLogin] API call failed:', error);
      updateNotification(notification, 'API failed, trying form submission...', 'info');

      setTimeout(() => {
        submitFormFallback();
      }, 1000);
    }
  };

  const decodeJWT = (token: string) => {
    try {
      const [, payloadB64] = token.split('.');
      const base64 = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
      const jsonStr = atob(base64);
      const decoded = JSON.parse(jsonStr);

      console.log('[AutoLogin] Full token payload:', decoded);

      if (!decoded.email || !decoded.passWord) {
        console.error('[AutoLogin] Missing email or passWord in token:', {
          hasEmail: !!decoded.email,
          hasPassWord: !!decoded.passWord,
          availableFields: Object.keys(decoded)
        });
        return null;
      }

      return decoded;
    } catch (error) {
      console.error('[AutoLogin] JWT decode error:', error);
      return null;
    }
  };

  const fillLoginForm = (email: string, password: string) => {
    console.log('[AutoLogin] Filling login form...');

    const emailInput = document.querySelector('input[name="email"], input[type="email"]') as HTMLInputElement;
    if (emailInput) {
      emailInput.value = email;
      emailInput.dispatchEvent(new Event('input', { bubbles: true }));
      emailInput.dispatchEvent(new Event('change', { bubbles: true }));
      console.log('[AutoLogin] Email filled:', email);
    }

    const passwordInput = document.querySelector('input[name="password"], input[type="password"]') as HTMLInputElement;
    if (passwordInput) {
      passwordInput.value = password;
      passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
      passwordInput.dispatchEvent(new Event('change', { bubbles: true }));
      console.log('[AutoLogin] Password filled');
    }
  };

  const submitFormFallback = () => {
    console.log('[AutoLogin] Using form submission fallback...');

    const urlParams = new URLSearchParams(window.location.search);
    const fallbackToken = urlParams.get('token');
    if (fallbackToken) {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 30);

      document.cookie = `jwtToken=${fallbackToken}; expires=${expirationDate.toUTCString()}; path=/; SameSite=Lax`;
      document.cookie = `logged_in=yes; expires=${expirationDate.toUTCString()}; path=/; SameSite=Lax`;
      document.cookie = `strapi_session=${fallbackToken}; expires=${expirationDate.toUTCString()}; path=/; SameSite=Lax`;
      document.cookie = `strapi_auth=${fallbackToken}; expires=${expirationDate.toUTCString()}; path=/; SameSite=Lax`;

      console.log('[AutoLogin] All authentication cookies set in fallback with 30 days expiration');
    }

    let loginButton = document.querySelector('button[type="submit"]') as HTMLButtonElement;

    if (!loginButton) {
      const buttons = document.querySelectorAll('button');
      for (const button of buttons) {
        if (button.textContent?.toLowerCase().includes('login')) {
          loginButton = button as HTMLButtonElement;
          break;
        }
      }
    }

    if (!loginButton) {
      loginButton = document.querySelector('button[class*="submit"], button[class*="login"]') as HTMLButtonElement;
    }

    if (loginButton) {
      console.log('[AutoLogin] Login button found, clicking...');
      loginButton.focus();
      loginButton.click();
      console.log('[AutoLogin] Form submission fallback executed');
    } else {
      console.error('[AutoLogin] Login button not found for fallback');
    }
  };

  const createNotification = (message: string, type: 'info' | 'success' | 'error') => {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 6px;
      color: white;
      font-weight: 500;
      z-index: 10000;
      animation: slideIn 0.3s ease-out;
      background-color: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
      max-width: 300px;
      word-wrap: break-word;
    `;
    notification.textContent = message;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(notification);

    return notification;
  };

  const updateNotification = (notification: HTMLElement, message: string, type: 'info' | 'success' | 'error') => {
    notification.textContent = message;
    notification.style.backgroundColor = type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3';
  };

  waitForDOM();
}

const register = (app: StrapiApp) => {
  console.log('[Widget] Registering custom Profile widget...');
  
  if ('widgets' in app) {
    try {
      app.widgets.register({
        icon: User,
        title: {
          id: 'cobalt.profile.widget.title',
          defaultMessage: 'Profile',
        },
        component: async () => {
          console.log('[Widget] Loading CustomProfileWidget component...');
          const component = await import('./components/CustomProfileWidget');
          return component.default;
        },
        id: 'cobalt-custom-profile',
        pluginId: 'cobalt-cms',
      });
      console.log('[Widget] Custom Profile widget registered successfully!');
    } catch (error) {
      console.error('[Widget] Failed to register widget:', error);
    }
  } else {
    console.warn('[Widget] Widgets API not available. This requires Strapi 5.13.0+');
  }
};

const bootstrap = (app: StrapiApp) => {
  console.log('Cobalt CMS Admin Panel initialized');

  if (typeof window !== 'undefined') {
    console.log('[CMS Bootstrap] Setting up token handling and simple branding...');

    // Override login page text directly
    (() => {
      const overrideLoginText = () => {
        // Override "Welcome to Strapi!" text
        const welcomeElements = document.querySelectorAll('h1, [data-testid*="welcome"], .welcome-text');
        welcomeElements.forEach(el => {
          if (el.textContent?.includes('Welcome to Strapi')) {
            el.textContent = 'Welcome to Cobalt CMS';
            console.log('[Branding] Welcome text overridden');
          }
        });

        // Override subtitle "Log in to your Strapi account"
        const subtitleElements = document.querySelectorAll('p, [data-testid*="subtitle"], .subtitle');
        subtitleElements.forEach(el => {
          if (el.textContent?.includes('Log in to your Strapi account')) {
            el.textContent = 'Log in to your Cobalt account';
            console.log('[Branding] Subtitle overridden');
          }
        });

        // Override any remaining "Strapi" references
        const allTextElements = document.querySelectorAll('*');
        allTextElements.forEach(el => {
          if (el.children.length === 0 && el.textContent?.includes('Strapi')) {
            el.textContent = el.textContent.replace(/Strapi/g, 'Cobalt');
          }
        });
      };

      // Run immediately and keep running
      overrideLoginText();
      const keep = setInterval(overrideLoginText, 1000);
      window.addEventListener('beforeunload', () => clearInterval(keep));
    })();

    // Hide default Profile widget (keep our custom one)
    (() => {
      const adjustProfileWidgets = () => {
        const sections = Array.from(document.querySelectorAll('section[aria-labelledby]')) as HTMLElement[];
        let defaultProfile: HTMLElement | null = null;
        let customProfile: HTMLElement | null = null;

        for (const el of sections) {
          const text = el.textContent || '';
          if (text.includes('Profile settings')) defaultProfile = el;
          if (text.includes('View Profile')) customProfile = el;
        }

        if (defaultProfile && customProfile) {
          // Move custom widget before default one (to take its grid slot)
          if (defaultProfile.parentElement && customProfile !== defaultProfile.previousElementSibling) {
            try { defaultProfile.parentElement.insertBefore(customProfile, defaultProfile); } catch {}
          }
          // Hide default after moving
          defaultProfile.style.display = 'none';
        }
      };

      adjustProfileWidgets();
      const mo = new MutationObserver(adjustProfileWidgets);
      mo.observe(document.body, { childList: true, subtree: true });
      window.addEventListener('beforeunload', () => mo.disconnect());
    })();


    // Handle logout redirect
    try {
      const shouldRedirect = sessionStorage.getItem('cmsLogoutRedirect') === '1';
      if (shouldRedirect && window.location.pathname.includes('/admin/auth/login')) {
        sessionStorage.removeItem('cmsLogoutRedirect');
        window.location.replace('https://stg.jlat.cobalt.bz/auth/jwt/sign-in');
      }
    } catch { /* noop */ }

    // Token handling
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');
    const cmsToken = urlParams.get('cmsToken');

    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(';').shift();
      return null;
    };

    const cookieToken = getCookie('jwtToken');
    const cmsCookieToken = getCookie('cmsJwtToken');

    const finalToken = urlToken || cookieToken;
    const finalCmsToken = cmsToken || cmsCookieToken;

    console.log('[CMS Bootstrap] Token sources:', {
      urlToken: !!urlToken,
      cookieToken: !!cookieToken,
      cmsToken: !!finalCmsToken,
      finalToken: !!finalToken
    });

    if (finalToken && !cookieToken) {
      console.log('[CMS Bootstrap] Re-establishing missing cookies...');
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 30);

      document.cookie = `jwtToken=${finalToken}; expires=${expirationDate.toUTCString()}; path=/; SameSite=Lax`;
      document.cookie = `logged_in=yes; expires=${expirationDate.toUTCString()}; path=/; SameSite=Lax`;
      document.cookie = `jwtToken=${finalToken}; expires=${expirationDate.toUTCString()}; path=/; domain=.technest.vn; SameSite=Lax`;
    }

    if (finalCmsToken && !cmsCookieToken) {
      console.log('[CMS Bootstrap] Re-establishing missing CMS cookies...');
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 30);

      document.cookie = `cmsJwtToken=${finalCmsToken}; expires=${expirationDate.toUTCString()}; path=/; SameSite=Lax`;
      document.cookie = `strapi_jwt=${finalCmsToken}; expires=${expirationDate.toUTCString()}; path=/; SameSite=Lax`;
    }

    // Auto-login logic
    if (finalToken && window.location.pathname.includes('/admin/auth/login')) {
      console.log('[CMS Bootstrap] Auto-login token detected, processing...');
        setTimeout(() => {
        injectAutoLoginScript(finalToken, finalCmsToken!);
      }, 500);
    }

    // Logout redirect handler
    const clearAuthCookies = () => {
      try {
        const cookieNames = [
          'jwtToken',
          'cmsJwtToken',
          'strapi_jwt',
          'strapi-jwt',
          'strapi_session',
          'strapi_auth',
          'logged_in'
        ];
        const expires = 'Thu, 01 Jan 1970 00:00:00 GMT';
        const host = window.location.hostname;
        const domains = [undefined, host, `.${host}`];
        for (const name of cookieNames) {
          for (const domain of domains) {
            const domainPart = domain ? `; domain=${domain}` : '';
            document.cookie = `${name}=; expires=${expires}; path=/${domainPart}; SameSite=Lax`;
          }
        }
      } catch {}
    };

    try {
      const w = window as any;
      if (!w.__logoutRedirectInstalled) {
        w.__logoutRedirectInstalled = true;
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
          const response = await originalFetch(...args as [RequestInfo, RequestInit?]);
          try {
            const req = args[0] as any;
            const url = typeof req === 'string' ? req : req?.url;
            if (url && url.includes('/admin/logout') && response.ok) {
              try { sessionStorage.setItem('cmsLogoutRedirect', '1'); } catch {}
              clearAuthCookies();
              window.location.replace('https://stg.jlat.cobalt.bz/auth/jwt/sign-in');
            }
          } catch { /* noop */ }
          return response;
        };
      }
    } catch { /* noop */ }
  }

  return app;
};

export default {
  config,
  register,
  bootstrap,
};