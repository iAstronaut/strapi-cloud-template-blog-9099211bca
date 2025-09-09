import React, { useState, useEffect } from 'react';
import { Box, Typography, Badge, IconButton } from '@strapi/design-system';
import { User, ExternalLink } from '@strapi/icons';
import { Widget } from '@strapi/admin/strapi-admin';

interface UserProfile {
  id: number;
  username: string;
  email: string;
  firstname?: string;
  lastname?: string;
  blocked: boolean;
  confirmed: boolean;
  createdAt: string;
  updatedAt: string;
  avatar?: {
    url: string;
  };
  roles: Array<{
    id: number;
    name: string;
    code: string;
  }>;
}

const CustomProfileWidget = () => {
  console.log('[CustomProfileWidget] Component initialized');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('[CustomProfileWidget] useEffect triggered');
    const fetchProfile = async () => {
      console.log('[CustomProfileWidget] Starting fetch...');
      try {
        // Get token from cookies
        const getCookie = (name: string) => {
          const value = `; ${document.cookie}`;
          const parts = value.split(`; ${name}=`);
          if (parts.length === 2) return parts.pop()?.split(';').shift();
          return null;
        };
        
        const token = getCookie('cmsJwtToken') || getCookie('strapi_jwt') || getCookie('jwtToken') 
          || sessionStorage.getItem('jwtToken') || localStorage.getItem('jwtToken');
        console.log('Available cookies:', document.cookie);
        console.log('SessionStorage:', sessionStorage.getItem('jwtToken'));
        console.log('Using token:', !!token, token ? token.substring(0, 20) + '...' : 'none');
        
        // Try different endpoints
        const endpoints = [
          '/admin/users/me',
          '/admin/me',
          '/admin/user',
          '/admin/users/me?populate=*'
        ];
        
        let response;
        let lastError;
        
        for (const endpoint of endpoints) {
          try {
            console.log(`Trying endpoint: ${endpoint}`);
            response = await fetch(endpoint, {
              credentials: 'include',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            });
            
            if (response.ok) {
              console.log(`Success with endpoint: ${endpoint}`);
              break;
            } else {
              console.log(`Failed with ${endpoint}: ${response.status}`);
              lastError = response.status;
            }
          } catch (err) {
            console.log(`Error with ${endpoint}:`, err);
            lastError = err;
          }
        }
        
        if (!response || !response.ok) {
          throw new Error(`All endpoints failed. Last error: ${lastError}`);
        }
        console.log('Profile response:', response);
        if (!response.ok) {
          throw new Error(`Failed to fetch profile: ${response.status} ${response.statusText}`);
        }

        console.log('About to parse JSON...');
        const data = await response.json();
        console.log('Profile data received:', data);
        
        // Handle Strapi's data wrapper structure
        const profileData = data.data || data;
        console.log('Extracted profile data:', profileData);
        setProfile(profileData);
        setLoading(false);
      } catch (err) {
        console.error('Profile fetch error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load profile');
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  if (loading) {
    return <Widget.Loading />;
  }

  if (error) {
    return <Widget.Error />;
  }

  if (!profile) {
    return <Widget.NoData>No profile data available</Widget.NoData>;
  }

  const displayName = profile.firstname && profile.lastname
    ? `${profile.firstname} ${profile.lastname}`
    : profile.username;

  const primaryRole = profile.roles?.[0]?.name || 'User';

  return (
    <Box padding={4} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
      {/* Header with button */}
      <Box style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 10 }}>
        <IconButton
          label="View Profile"
          onClick={() => window.open('/cms/admin/me', '_blank')}
          style={{ width: '28px', height: '28px' }}
        >
          <ExternalLink />
        </IconButton>
      </Box>
      
      <Box style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '12px' }}>
        {/* Header with Avatar and Name */}
        <Box style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Box
            width="56px"
            height="56px"
            borderRadius="50%"
            overflow="hidden"
            display="flex"
            style={{ border: '2px solid #e0e0e0', alignItems: 'center', justifyContent: 'center' }}
          >
            <img
              src={profile.avatar?.url || '/uploads/falcon_icon_e04684e5aa.png'}
              alt={displayName}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.setAttribute('style', 'display: flex');
              }}
            />
            <Box display="none" width="100%" height="100%" style={{ alignItems: 'center', justifyContent: 'center' }}>
              <User width="28px" height="28px" />
            </Box>
          </Box>
        </Box>

        {/* Profile Information - Swapped as requested */}
        <Box style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: '1px' }}>
          {/* Last Name (where Username was originally) */}
          <Box style={{ backgroundColor: 'white', padding: '8px 12px', textAlign: 'center', width: '100%' }}>
            <Typography variant="omega" style={{ fontSize: '24px', fontWeight: '550' }}>
              {profile.lastname || 'Not provided'}
            </Typography>
          </Box>
          
          {/* Username (where Email was originally) */}
          <Box style={{ backgroundColor: 'white', padding: '8px 12px', textAlign: 'center', width: '100%' }}>
            <Typography variant="omega" style={{ fontSize: '16px' }}>
              {profile.username}
            </Typography>
          </Box>
          
          {/* Role */}
          <Box style={{ padding: '8px 12px', backgroundColor: '#EAEAEF', borderRadius: '6px', border: '1px solid #e0e0e0', textAlign: 'center', width: '100%', marginTop: '8px' }}>
            <Typography variant="omega" textColor="neutral600" style={{ fontSize: '11px', fontWeight: '500' }}>
              {primaryRole.toUpperCase()}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default CustomProfileWidget;
