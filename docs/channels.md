# Channel adapters

WhatsApp and Messenger both call the same resident desk as the website. Verification uses the Meta hub challenge. Inbound text is mapped to a conversation id of `whatsapp:<from>` or `messenger:<from>`.

If `WHATSAPP_TOKEN` or `MESSENGER_PAGE_TOKEN` is unset, the route does not call Meta. It returns the desk reply in the JSON body so a demo and the unit tests can run with no secrets. Set the token later if you want the route to send the reply back through the Cloud API.

## WhatsApp

Callback URL: `https://property-chat.quvantic.com/api/channels/whatsapp`

Verify token: `WHATSAPP_VERIFY_TOKEN` (default `keystone-demo-verify`)

```bash
curl "http://127.0.0.1:47231/api/channels/whatsapp?hub.mode=subscribe&hub.verify_token=keystone-demo-verify&hub.challenge=abc123"
```

## Messenger

Callback URL: `https://property-chat.quvantic.com/api/channels/messenger`

Verify token: `MESSENGER_VERIFY_TOKEN` (default `keystone-demo-verify`)
