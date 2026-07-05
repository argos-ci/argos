# Argos frontend

## GraphQL / Apollo Client

### Mutations: prefer `client.mutate` over `useMutation`

Only reach for `useMutation` when you actually render from its result tuple —
i.e. you read `loading` / `data` / `error` to drive the UI (a button spinner, an
inline error, a success screen). `useMutation` subscribes the component to the
mutation's own state and **re-renders it while the request is in flight even if
you never read that state**, which is wasted work.

When you only need to fire the mutation (you track pending/errors yourself, or
not at all), call the client directly:

```tsx
const client = useApolloClient();
// …
await client.mutate({ mutation: MyMutation, variables });
```

Fold any `variables` / `update` / `optimisticResponse` / `context` you were
passing to `useMutation` (or at the call site) into that single
`client.mutate({ mutation, ... })` object.

### Pending state in a dialog

Don't track a dialog's submit-pending state with a local `useState` (nor with
`useMutation`). Drive `ModalActionContext`'s `isPending` around the call: a
dialog `Form` does this automatically, or set it yourself
(`use(ModalActionContext)` → `setIsPending`). This disables the footer buttons
(including `DialogDismiss`) and blocks dismissal for the whole modal while the
request is in flight.
