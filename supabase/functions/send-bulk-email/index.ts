import { SESClient, SendEmailCommand, VerifyEmailIdentityCommand } from "npm:@aws-sdk/client-ses@3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function makeSESClient() {
  return new SESClient({
    region: Deno.env.get("AWS_REGION") || "us-east-1",
    credentials: {
      accessKeyId: Deno.env.get("AWS_ACCESS_KEY_ID")!,
      secretAccessKey: Deno.env.get("AWS_SECRET_ACCESS_KEY")!,
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // Action: verify-identity — call SES VerifyEmailIdentity so AWS sends a link to the email
    if (body.action === "verify-identity") {
      const { email } = body;
      if (!email) {
        return new Response(JSON.stringify({ error: "email is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const ses = makeSESClient();
      await ses.send(new VerifyEmailIdentityCommand({ EmailAddress: email }));
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Default action: send bulk email
    const { contacts, subject, htmlBody, fromEmail } = body;

    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      return new Response(JSON.stringify({ error: "contacts array is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ses = makeSESClient();
    const results = [];

    for (const contact of contacts) {
      const command = new SendEmailCommand({
        Source: fromEmail || Deno.env.get("FROM_EMAIL"),
        Destination: {
          ToAddresses: [contact.email],
        },
        Message: {
          Subject: { Data: subject, Charset: "UTF-8" },
          Body: {
            Html: { Data: htmlBody, Charset: "UTF-8" },
          },
        },
      });

      const result = await ses.send(command);
      results.push({ email: contact.email, messageId: result.MessageId });
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
