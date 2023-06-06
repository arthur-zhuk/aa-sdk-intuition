import { Box, Flex } from "@chakra-ui/react";
import Link from "next/link";
import Image from "next/image";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAppState } from "~/clients/appState";

export default function NavigationBar() {
  const { state } = useAppState();
  return (
    <Flex
      padding="20px 10px"
      marginBottom="25px"
      justifyContent="center"
      alignItems="center"
      position="relative"
    >
      <Link href="/">
        <Image width={300} height={100} src="/logo.svg" alt="logo" />
      </Link>
      {state !== "UNCONNECTED" && (
        <Box position="absolute" right="20px" top="20px">
          <ConnectButton />
        </Box>
      )}
    </Flex>
  );
}
