import * as React from 'react';

import { Box, Button, Flex, Grid, Typography, Link } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { NavLink, Navigate, useNavigate, useMatch, useLocation } from 'react-router-dom';
import * as yup from 'yup';
import { ValidationError } from 'yup';

const REGISTER_USER_SCHEMA = yup.object().shape({
  firstname: yup.string().trim().required('Firstname is required').nullable(),
  lastname: yup.string().nullable(),
  password: yup
    .string()
    .min(8, 'Password must be at least 8 characters')
    .matches(/[a-z]/, 'Password must contain at least 1 lowercase letter')
    .matches(/[A-Z]/, 'Password must contain at least 1 uppercase letter')
    .matches(/\d/, 'Password must contain at least 1 number')
    .required('Password is required')
    .nullable(),
  confirmPassword: yup
    .string()
    .required('Confirm password is required')
    .oneOf([yup.ref('password')], 'Passwords must match')
    .nullable(),
  registrationToken: yup.string().required('Registration token is required'),
});

const REGISTER_ADMIN_SCHEMA = yup.object().shape({
  firstname: yup
    .string()
    .trim()
    .required('Firstname is required')
    .nullable(),
  lastname: yup.string().nullable(),
  password: yup
    .string()
    .min(8, 'Password must be at least 8 characters')
    .matches(/[a-z]/, 'Password must contain at least 1 lowercase letter')
    .matches(/[A-Z]/, 'Password must contain at least 1 uppercase letter')
    .matches(/\d/, 'Password must contain at least 1 number')
    .required('Password is required')
    .nullable(),
  confirmPassword: yup
    .string()
    .required('Confirm password is required')
    .oneOf([yup.ref('password')], 'Passwords must match'),
  email: yup
    .string()
    .email('Not a valid email')
    .required('Email is required')
    .nullable(),
});

interface RegisterProps {
  hasAdmin?: boolean;
}

interface RegisterFormValues {
  firstname: string;
  lastname: string | undefined;
  email: string;
  password: string;
  confirmPassword: string;
  registrationToken: string | undefined;
  news: boolean;
}

/**
 * @description Trims all values but the password & sets lastName to null if it's a falsey value.
 */
function normalizeData(data: RegisterFormValues) {
  const result: any = {};

  Object.entries(data).forEach(([key, value]) => {
    if (!['password', 'confirmPassword'].includes(key) && typeof value === 'string') {
      result[key] = value.trim();

      if (key === 'lastname') {
        result[key] = value.trim() || undefined;
      }
    } else {
      result[key] = value;
    }
  });

  return result as {
    firstname: string;
    lastname: string | undefined;
    email: string;
    password: string;
    confirmPassword: string;
    registrationToken: string | undefined;
    news: boolean;
  };
}

const Register = ({ hasAdmin }: RegisterProps) => {
  const navigate = useNavigate();
  const [submitCount, setSubmitCount] = React.useState(0);
  const [apiError, setApiError] = React.useState<string>();
  const { formatMessage } = useIntl();
  const { search: searchString } = useLocation();
  const query = React.useMemo(() => new URLSearchParams(searchString), [searchString]);
  const match = useMatch('/auth/:authType');

  const registrationToken = query.get('registrationToken');

  // Form state
  const [formData, setFormData] = React.useState<RegisterFormValues>({
    firstname: '',
    lastname: undefined,
    email: '',
    password: '',
    confirmPassword: '',
    registrationToken: registrationToken || undefined,
    news: false,
  });

  const [errors, setErrors] = React.useState<Record<string, string>>({});

  if (
    !match ||
    (match.params.authType !== 'register' && match.params.authType !== 'register-admin')
  ) {
    return <Navigate to="/" />;
  }

  const isAdminRegistration = match.params.authType === 'register-admin';

  const schema = isAdminRegistration ? REGISTER_ADMIN_SCHEMA : REGISTER_USER_SCHEMA;

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
      const normalizedData = normalizeData(formData);
      await schema.validate(normalizedData, { abortEarly: false });

      // Here you would typically call your registration API
      console.log('Registration data:', normalizedData);

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
      setSubmitCount(submitCount + 1);
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
            id: 'Auth.form.register.subtitle',
            defaultMessage:
              'Credentials are only used to authenticate in Cobalt CMS. All saved data will be stored in your database.',
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
              <Grid.Item col={6}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label htmlFor="firstname" style={{ fontWeight: 600, color: '#666' }}>
                    {formatMessage({
                      id: 'Auth.form.firstname.label',
                      defaultMessage: 'First Name',
                    })}
                    *
                  </label>
                  <input
                    id="firstname"
                    name="firstname"
                    type="text"
                    value={formData.firstname}
                    onChange={(e) => handleInputChange('firstname', e.target.value)}
                    style={{
                      padding: '8px 12px',
                      border: errors.firstname ? '1px solid #d02b20' : '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  />
                  {errors.firstname && (
                    <span style={{ color: '#d02b20', fontSize: '12px' }}>{errors.firstname}</span>
                  )}
                </div>
              </Grid.Item>
              <Grid.Item col={6}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label htmlFor="lastname" style={{ fontWeight: 600, color: '#666' }}>
                    {formatMessage({
                      id: 'Auth.form.lastname.label',
                      defaultMessage: 'Last Name',
                    })}
                  </label>
                  <input
                    id="lastname"
                    name="lastname"
                    type="text"
                    value={formData.lastname || ''}
                    onChange={(e) => handleInputChange('lastname', e.target.value)}
                    style={{
                      padding: '8px 12px',
                      border: errors.lastname ? '1px solid #d02b20' : '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  />
                  {errors.lastname && (
                    <span style={{ color: '#d02b20', fontSize: '12px' }}>{errors.lastname}</span>
                  )}
                </div>
              </Grid.Item>
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
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    style={{
                      padding: '8px 12px',
                      border: errors.email ? '1px solid #d02b20' : '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px',
                      backgroundColor: !isAdminRegistration ? '#f6f6f9' : 'white',
                      color: !isAdminRegistration ? '#666' : 'black'
                    }}
                    disabled={!isAdminRegistration}
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
                  <input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    style={{
                      padding: '8px 12px',
                      border: errors.password ? '1px solid #d02b20' : '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  />
                  <span style={{ color: '#666', fontSize: '12px' }}>
                    {formatMessage({
                      id: 'Auth.form.password.hint',
                      defaultMessage:
                        'Must be at least 8 characters, 1 uppercase, 1 lowercase & 1 number',
                    })}
                  </span>
                  {errors.password && (
                    <span style={{ color: '#d02b20', fontSize: '12px' }}>{errors.password}</span>
                  )}
                </div>
              </Grid.Item>
              <Grid.Item col={12}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label htmlFor="confirmPassword" style={{ fontWeight: 600, color: '#666' }}>
                    {formatMessage({
                      id: 'Auth.form.confirmPassword.label',
                      defaultMessage: 'Confirm Password',
                    })}
                    *
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    style={{
                      padding: '8px 12px',
                      border: errors.confirmPassword ? '1px solid #d02b20' : '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  />
                  {errors.confirmPassword && (
                    <span style={{ color: '#d02b20', fontSize: '12px' }}>{errors.confirmPassword}</span>
                  )}
                </div>
              </Grid.Item>
              <Grid.Item col={12}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      name="news"
                      checked={formData.news}
                      onChange={(e) => handleInputChange('news', e.target.checked)}
                    />
                    {formatMessage(
                      {
                        id: 'Auth.form.register.news.label',
                        defaultMessage:
                          'Keep me updated about new features & upcoming improvements (by doing this you accept the {terms} and the {policy}).',
                      },
                      {
                        terms: (
                          <a
                            target="_blank"
                            href="https://cobalt-cms.technest.vn/terms"
                            rel="noreferrer"
                            style={{ color: '#4945ff', textDecoration: 'none' }}
                          >
                            {formatMessage({
                              id: 'Auth.privacy-policy-agreement.terms',
                              defaultMessage: 'terms',
                            })}
                          </a>
                        ),
                        policy: (
                          <a
                            target="_blank"
                            href="https://cobalt-cms.technest.vn/privacy"
                            rel="noreferrer"
                            style={{ color: '#4945ff', textDecoration: 'none' }}
                          >
                            {formatMessage({
                              id: 'Auth.privacy-policy-agreement.policy',
                              defaultMessage: 'policy',
                            })}
                          </a>
                        ),
                      }
                    )}
                  </label>
                </div>
              </Grid.Item>
            </Grid.Root>
            <Button fullWidth size="L" type="submit">
              {formatMessage({
                id: 'Auth.form.button.register',
                defaultMessage: "Let's start",
              })}
            </Button>
          </Flex>
        </Box>
      </form>

      {match?.params.authType === 'register' && (
        <Box paddingTop={4}>
          <Flex justifyContent="center">
            <Link tag={NavLink} to="/auth/login">
              {formatMessage({
                id: 'Auth.link.signin.account',
                defaultMessage: 'Already have an account?',
              })}
            </Link>
          </Flex>
        </Box>
      )}
    </Box>
  );
};

export { Register };
export type { RegisterProps };