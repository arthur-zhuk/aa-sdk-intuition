---
outline: deep
head:
  - - meta
    - property: og:title
      content: getOwner
  - - meta
    - name: description
      content: Overview of the getOwner method on BaseSmartContractAccount
  - - meta
    - property: og:description
      content: Overview of the getOwner method on BaseSmartContractAccount
---

# getOwner

Returns the `SmartAccountSigner` that repensents the current owner for the account

## Usage

::: code-group

```ts [example.ts]
import { provider } from "./provider";
// [!code focus:99]
const ownerSigner = await provider.getOwner();
```

<<< @/snippets/provider.ts

:::

## Returns

### `SmartAccountSigner | undefined`

The `SmartAccountSigner` object that repensents the current owner for the account