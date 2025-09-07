import '../global.css';  
import { Stack } from 'expo-router';
import { SafeAreaProvider } from "react-native-safe-area-context";
export default function Root() { return <SafeAreaProvider><Stack screenOptions={{ headerShown:false }} /></SafeAreaProvider>}

