// context/UserRegistrationContext.tsx
import React, { createContext, useState, useContext } from 'react';

interface RegistrationData {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  phoneNumber: string;
  countryCode: string;
  country: string;
  password: string;
  confirmPassword: string;
  referralCode?: string;
  callingCode?: string;
  isLoginWithPhone?: boolean;
}

interface RegistrationContextProps {
  registrationData: RegistrationData;
  setRegistrationData: (data: Partial<RegistrationData>) => void;
}

const defaultData: RegistrationData = {
  firstName: '',
  lastName: '',
  username: '',
  email: '',
  phoneNumber: '',
  countryCode: '',
  country: '',
  password: '',
  confirmPassword: '',
  referralCode: '',
};

const UserRegistrationContext = createContext<RegistrationContextProps>({
  registrationData: defaultData,
  setRegistrationData: () => { },
});

export const UserRegistrationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [registrationData, setRegistrationDataState] = useState<RegistrationData>(defaultData);

  const setRegistrationData = (data: Partial<RegistrationData>) => {
    setRegistrationDataState(prev => ({ ...prev, ...data }));
  };

  return (
    <UserRegistrationContext.Provider value={{ registrationData, setRegistrationData }}>
      {children}
    </UserRegistrationContext.Provider>
  );
};

export const useUserRegistration = () => useContext(UserRegistrationContext);
