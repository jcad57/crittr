import * as SecureStore from "expo-secure-store";
import { createLargeSecureStore } from "./largeSecureStore";
export const secureStorage = createLargeSecureStore(SecureStore);
