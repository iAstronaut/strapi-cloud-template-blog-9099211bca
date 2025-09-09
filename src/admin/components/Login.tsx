import * as React from 'react';

import { Box, Button, Flex, Grid, Typography, Link } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { NavLink, Navigate, useNavigate, useMatch } from 'react-router-dom';
import * as yup from 'yup';
import { ValidationError } from 'yup';

const LOGIN_SCHEMA = yup.object().shape({
  email: yup
    .string()
    .email('Not a valid email')
    .required('Email is required')
    .nullable(),
  password: yup
    .string()
    .required('Password is required')
    .nullable(),
});

interface LoginProps {
  hasAdmin?: boolean;
}

interface LoginFormValues {
  email: string;
  password: string;
  rememberMe: boolean;
}

const Login = ({ hasAdmin }: LoginProps) => {
  const navigate = useNavigate();
  const [apiError, setApiError] = React.useState<string>();
  const { formatMessage } = useIntl();
  const match = useMatch('/auth/:authType');

  // Form state
  const [formData, setFormData] = React.useState<LoginFormValues>({
    email: '',
    password: '',
    rememberMe: false,
  });

  const [errors, setErrors] = React.useState<Record<string, string>>({});

  if (!match || match.params.authType !== 'login') {
    return <Navigate to="/" />;
  }

  const handleInputChange = (name: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await LOGIN_SCHEMA.validate(formData, { abortEarly: false });

      // Here you would typically call your login API
      console.log('Login data:', formData);

      // For demo purposes, just navigate to home
      navigate('/');

    } catch (err) {
      if (err instanceof ValidationError) {
        const newErrors: Record<string, string> = {};
        err.inner.forEach(({ message, path }) => {
          if (path) {
            newErrors[path] = message;
          }
        });
        setErrors(newErrors);
      }
    }
  };

  return (
    <Box padding={8} background="neutral0">
      <Flex direction="column" alignItems="center" gap={3}>
        <Typography tag="h1" variant="alpha" textAlign="center">
          {formatMessage({
            id: 'Auth.form.welcome.title',
            defaultMessage: 'Welcome to Cobalt CMS!',
          })}
        </Typography>
        <Typography variant="epsilon" textColor="neutral600" textAlign="center">
          {formatMessage({
            id: 'Auth.form.welcome.subtitle',
            defaultMessage: 'Log in to your Cobalt CMS account',
          })}
        </Typography>
        {apiError ? (
          <Typography id="global-form-error" role="alert" tabIndex={-1} textColor="danger600">
            {apiError}
          </Typography>
        ) : null}
      </Flex>

      <form onSubmit={handleSubmit}>
        <Box marginTop={7}>
          <Flex direction="column" alignItems="stretch" gap={6}>
            <Grid.Root gap={4}>
              <Grid.Item col={12}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label htmlFor="email" style={{ fontWeight: 600, color: '#666' }}>
                    {formatMessage({
                      id: 'Auth.form.email.label',
                      defaultMessage: 'Email',
                    })}
                    *
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="e.g. kai@doe.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    style={{
                      padding: '8px 12px',
                      border: errors.email ? '1px solid #d02b20' : '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  />
                  {errors.email && (
                    <span style={{ color: '#d02b20', fontSize: '12px' }}>{errors.email}</span>
                  )}
                </div>
              </Grid.Item>
              <Grid.Item col={12}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label htmlFor="password" style={{ fontWeight: 600, color: '#666' }}>
                    {formatMessage({
                      id: 'global.password',
                      defaultMessage: 'Password',
                    })}
                    *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      style={{
                        padding: '8px 12px',
                        paddingRight: '40px',
                        border: errors.password ? '1px solid #d02b20' : '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px',
                        width: '100%',
                        boxSizing: 'border-box'
                      }}
                    />
                    <button
                      type="button"
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px'
                      }}
                      onClick={() => {
                        const input = document.getElementById('password') as HTMLInputElement;
                        if (input) {
                          input.type = input.type === 'password' ? 'text' : 'password';
                        }
                      }}
                    >
                      👁️
                    </button>
                  </div>
                  {errors.password && (
                    <span style={{ color: '#d02b20', fontSize: '12px' }}>{errors.password}</span>
                  )}
                </div>
              </Grid.Item>
              <Grid.Item col={12}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    id="rememberMe"
                    name="rememberMe"
                    checked={formData.rememberMe}
                    onChange={(e) => handleInputChange('rememberMe', e.target.checked)}
                  />
                  <label htmlFor="rememberMe" style={{ color: '#666', fontSize: '14px' }}>
                    {formatMessage({
                      id: 'Auth.form.rememberMe.label',
                      defaultMessage: 'Remember me',
                    })}
                  </label>
                </div>
              </Grid.Item>
            </Grid.Root>
            <Button fullWidth size="L" type="submit">
              {formatMessage({
                id: 'Auth.form.button.login',
                defaultMessage: 'Login',
              })}
            </Button>
          </Flex>
        </Box>
      </form>

      <Box paddingTop={4}>
        <Flex justifyContent="center">
          <Link tag={NavLink} to="/auth/forgot-password">
            {formatMessage({
              id: 'Auth.link.forgot-password',
              defaultMessage: 'Forgot your password?',
            })}
          </Link>
        </Flex>
      </Box>
    </Box>
  );
};

export { Login };
export type { LoginProps };