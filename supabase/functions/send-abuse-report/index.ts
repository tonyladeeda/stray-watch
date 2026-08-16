import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

// TBD: We can expand this list or make it dynamic by zip code later
const OFFICIAL_EMAILS = ['asdempsey@gmail.com'] 

serve(async (req) => {
  const payload = await req.json()
  const report = payload.record 

  // Format the email using HTML
  const htmlContent = `
    <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #e11d48; border-bottom: 2px solid #e11d48; padding-bottom: 10px;">
        URGENT: ${report.category} Report
      </h2>
      <p><strong>Category:</strong> ${report.category}</p>
      <p><strong>Incident Details:</strong></p>
      <blockquote style="background: #f1f5f9; padding: 15px; border-left: 4px solid #94a3b8; margin: 0;">
        ${report.details}
      </blockquote>
      <p><strong>Animal ID:</strong> ${report.animal_id}</p>
      <p><strong>Report Timestamp:</strong> ${new Date(report.created_at).toLocaleString()}</p>
      <br/>
      <p style="font-size: 12px; color: #64748b;">
        <em>This report was generated via the Stray Watch platform. The reporting user confirmed this report is legitimate to the best of their knowledge. Please investigate immediately.</em>
      </p>
    </div>
  `;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`
    },
    body: JSON.stringify({
      from: 'Stray Watch Reports <onboarding@resend.dev>', // Resend's default testing email
      to: OFFICIAL_EMAILS,
      subject: `Stray Watch Alert: ${report.category}`,
      html: htmlContent
    })
  })

  const data = await res.json()
  return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } })
})