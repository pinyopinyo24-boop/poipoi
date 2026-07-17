/**
 * PoiPoi Mobile App - Main Component
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ChatScreen } from './screens/ChatScreen';

const Stack = createNativeStackNavigator();

export const App: React.FC = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animationEnabled: true,
        }}
      >
        <Stack.Screen
          name="Chat"
          component={ChatScreen}
          options={{
            title: 'PoiPoi Chat',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;
