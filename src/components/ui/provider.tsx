"use client"

import { ChakraProvider, defaultSystem } from "@chakra-ui/react"
import {
  ColorModeProvider,
  type ColorModeProviderProps,
} from "./color-mode"

export function Provider(props: ColorModeProviderProps) {
  // Force dark mode for the entire application
  return (
    <div className="dark" style={{ height: "100%" }}>
      <ChakraProvider value={defaultSystem}>
        <ColorModeProvider forcedTheme="dark" {...props} />
      </ChakraProvider>
    </div>
  )
}
