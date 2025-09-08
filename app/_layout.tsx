import '../global.css';  
import { Slot, Stack } from 'expo-router';
import { SafeAreaProvider } from "react-native-safe-area-context";
export default function Root() { return <SafeAreaProvider><Slot /></SafeAreaProvider>}

