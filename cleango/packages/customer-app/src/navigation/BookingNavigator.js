import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import ServiceSelectionScreen from '../screens/Home/ServiceSelectionScreen';
import BookingFormScreen from '../screens/Home/BookingFormScreen';
import BookingConfirmScreen from '../screens/Home/BookingConfirmScreen';
import PaymentWebviewScreen from '../screens/Home/PaymentWebviewScreen';

const Stack = createStackNavigator();

const BookingNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="ServiceSelection"
    >
      <Stack.Screen name="ServiceSelection" component={ServiceSelectionScreen} />
      <Stack.Screen name="BookingForm" component={BookingFormScreen} />
      <Stack.Screen
        name="BookingConfirm"
        component={BookingConfirmScreen}
      />
      <Stack.Screen
        name="PaymentWebview"
        component={PaymentWebviewScreen}
        options={{ gestureEnabled: false }}
      />
    </Stack.Navigator>
  );
};

export default BookingNavigator;
