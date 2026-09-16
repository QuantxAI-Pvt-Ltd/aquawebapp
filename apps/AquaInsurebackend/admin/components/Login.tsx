import React from 'react';
import { Button, FormGroup, Input, Label } from '@adminjs/design-system';

export type LoginProps = {
  action: string;
  errorMessage?: string;
};

const Login: React.FC<LoginProps> = (props) => {
  const { action, errorMessage } = props;

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8f9fc', margin: '-20px' }}>
      <div style={{ width: '100%', maxWidth: '420px', padding: '3rem 2rem', backgroundColor: 'white', borderRadius: '1.5rem', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', display: 'flex', flexDirection: 'column', alignItems: 'center', boxSizing: 'border-box' }}>
        
        {/* Logo */}
        <div style={{ width: '150px', height: '120px', marginBottom: '1.5rem', backgroundImage: 'url(/public/logo.jpeg)', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }} />

        {/* Error message */}
        {errorMessage && (
          <div style={{ width: '100%', marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#fef2f2', color: '#dc2626', borderRadius: '0.375rem', fontSize: '0.875rem', textAlign: 'center', boxSizing: 'border-box' }}>
            {errorMessage}
          </div>
        )}

        {/* Form */}
        <form action={action} method="POST" style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
          <FormGroup style={{ marginBottom: '1rem' }}>
            <Label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem', display: 'block' }} required>Email</Label>
            <Input name="email" type="email" placeholder="Email" style={{ width: '100%', padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '0.5rem', boxSizing: 'border-box', fontSize: '1rem' }} required />
          </FormGroup>
          <FormGroup style={{ marginBottom: '1.5rem' }}>
            <Label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem', display: 'block' }} required>Password</Label>
            <Input name="password" type="password" placeholder="Password" style={{ width: '100%', padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '0.5rem', boxSizing: 'border-box', fontSize: '1rem' }} required />
          </FormGroup>
          <Button type="submit" variant="primary" style={{ width: '100%', padding: '0.875rem', backgroundColor: '#006876', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', display: 'flex', justifyContent: 'center', fontWeight: 'bold', fontSize: '1rem', marginTop: '0.5rem' }}>
            Login
          </Button>
        </form>

      </div>
    </div>
  );
};

export default Login;
