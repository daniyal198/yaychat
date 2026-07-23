export const colors = {
  // Base colors
  background: '#000000',
  surface: '#121212',
  surfaceLight: '#1E1E1E',
  border: '#2f2f2f',

  // Text colors
  textPrimary: '#FFFFFF',
  textSecondary: '#d5d5d5',
  textMuted: '#B7B7B7',

  // Brand colors
  primary: '#FF8728',
  primaryDark: '#E66F00',

  // Status colors
  success: '#4CAF50',
  error: '#F44336',
  warning: '#FFC107',

  // Specific UI elements
  tabBarBackground: '#2E2D2D',
  headerBackground: '#000000',
  cardBackground: '#121212',
  buttonBackground: '#2E2D2D',
};

export const styles = {
  screenContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerStyle: {
    backgroundColor: colors.headerBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    elevation: 0, // Remove shadow on Android
    shadowOpacity: 0, // Remove shadow on iOS
  },
  tabBarStyle: {
    backgroundColor: colors.tabBarBackground,
    borderTopWidth: 0,
    borderTopColor: colors.border,
    paddingBottom: 8,
    paddingTop: 8,
    height: 70,
    elevation: 0, // Remove shadow on Android
    shadowOpacity: 0, // Remove shadow on iOS
  },
};
