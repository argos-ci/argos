# Database access

Production Postgres accepts no passwords. Every connection authenticates with
an RDS IAM token: signed locally from your AWS credentials, valid 15 minutes,
and checked only when the connection opens — an established session is never
interrupted by expiry.

Engineers connect as `argos_dev_ro`, which is read-only.

## psql

```bash
scripts/rds-token.sh --psql                       # connect
scripts/rds-token.sh --psql -c 'select now()'     # or run one statement
```

## TablePlus

Set the password field's dropdown to **Command Line** and point it at the
script:

```
/your-project-directory/argos/scripts/rds-token.sh --user argos_dev_ro
```

| Field    | Value                                                     |
| -------- | --------------------------------------------------------- |
| Host     | `argos-postgres.c1o45zoep0du.us-east-1.rds.amazonaws.com` |
| Port     | `5432`                                                    |
| User     | `argos_dev_ro`                                            |
| Database | `argos`                                                   |
| SSL mode | `REQUIRED`                                                |

TablePlus then mints a fresh token per connection, so nothing expires under
you. Two things have to line up, and both fail as
`password authentication failed`, which names neither:

- **User must equal `--user`.** A token is signed for one role and RDS rejects
  it for any other.
- **SSL mode must be `REQUIRED`.** RDS refuses IAM tokens in the clear.

If you need a token for something else, `scripts/rds-token.sh --raw` prints it
and nothing else.
