// backend/src/services/aiChatbot.js
// Bilingual (English & Tamil) Retrieval-Augmented Generation (RAG) Housing Assistant

/**
 * Knowledge Base Chunks (English & Tamil)
 */
export const knowledgeBase = [
  {
    id: "kb_eligibility_en",
    lang: "en",
    category: "eligibility",
    title: "Income Categories and Eligibility Norms",
    content: "Housing schemes are categorized by family income: Economically Weaker Section (EWS) for annual income up to ₹3,00,000; Low Income Group (LIG) for income between ₹3,00,001 and ₹6,00,000; Middle Income Group (MIG) for income up to ₹12,00,000; and Higher Income Group (HIG) above ₹12,00,000. Applicants must be permanent residents of the state aged 21 years or older and must not own a pucca house in the municipal limits.",
    source: "TNHB Scheme Guidelines 2026, Section 1.2"
  },
  {
    id: "kb_eligibility_ta",
    lang: "ta",
    category: "eligibility",
    title: "வருமான வரம்புகள் மற்றும் தகுதி விதிமுறைகள்",
    content: "வீட்டு வசதி வாரியத் திட்டங்கள் குடும்ப ஆண்டு வருமானத்தின் அடிப்படையில் பிரிக்கப்பட்டுள்ளன: பொருளாதாரத்தில் நலிவடைந்த பிரிவு (EWS) ஆண்டு வருமானம் ₹3,00,000 வரை; குறைந்த வருமானப் பிரிவு (LIG) ₹3,00,001 முதல் ₹6,00,000 வரை; நடுத்தர வருமானப் பிரிவு (MIG) ₹12,00,000 வரை; உயர் வருமானப் பிரிவு (HIG) ₹12,00,000-க்கு மேல். விண்ணப்பதாரர் 21 வயது பூர்த்தியடைந்தவராகவும், மாநிலத்தில் நிரந்தர குடியிருப்பாளராகவும், நகராட்சி எல்லைக்குள் சொந்தமாக கான்கிரீட் வீடு இல்லாதவராகவும் இருக்க வேண்டும்.",
    source: "தமிழ்நாடு வீட்டு வசதி வாரிய வழிகாட்டுதல் 2026, பிரிவு 1.2"
  },
  {
    id: "kb_scoring_en",
    lang: "en",
    category: "scoring",
    title: "Priority Scoring System Mechanics",
    content: "Priority ranking is computed transparently by the Priority Scoring Engine: Income tier awards up to 35 points (higher points for EWS/LIG); affirmative social categories award up to 30 points (SC/ST: 30, BC: 20, General: 10); benchmark disability awards 20 points; defense/ex-servicemen awards 15 points; single-woman/widow household awards 15 points; and state residence awards 2 points per completed year up to 20 points. Total points determine your rank.",
    source: "TNHB Transparent Scoring Norms, Section 2.4"
  },
  {
    id: "kb_scoring_ta",
    lang: "ta",
    category: "scoring",
    title: "முன்னுரிமை மதிப்பெண் கணக்கீடு",
    content: "முன்னுரிமை மதிப்பெண் வெளிப்படையான விதிகளின்படி கணக்கிடப்படுகிறது: குறைந்த வருமானப் பிரிவினருக்கு அதிகபட்சமாக 35 புள்ளிகள் (EWS/LIG); சமூக ஒதுக்கீடு பிரிவுகளுக்கு 30 புள்ளிகள் வரை (SC/ST: 30, BC: 20, General: 10); மாற்றுத்திறனாளிகளுக்கு 20 புள்ளிகள்; முன்னாள் ராணுவத்தினருக்கு 15 புள்ளிகள்; ஆதரவற்ற பெண்கள்/விதவைகளுக்கு 15 புள்ளிகள்; மற்றும் குடியிருப்பு காலத்திற்கு ஆண்டுக்கு 2 புள்ளிகள் வீதம் அதிகபட்சம் 20 புள்ளிகள் வழங்கப்படுகிறது.",
    source: "தமிழ்நாடு வீட்டு வசதி வாரிய முன்னுரிமை விதிகள், பிரிவு 2.4"
  },
  {
    id: "kb_documents_en",
    lang: "en",
    category: "documents",
    title: "Mandatory Document Checklist",
    content: "Applicants must upload clear PDF/JPEG copies of: 1) Aadhaar Card as proof of identity and age, 2) Income Certificate issued by the Revenue Tahsildar (valid within 12 months), 3) Community Certificate for reserved quota claims, 4) Nativity/Residence Certificate (minimum 5 years residence), and 5) Disability or Ex-Servicemen Certificate if claiming quota.",
    source: "TNHB Application Checklist, Section 3.1"
  },
  {
    id: "kb_documents_ta",
    lang: "ta",
    category: "documents",
    title: "தேவையான முக்கிய ஆவணங்கள்",
    content: "விண்ணப்பதாரர்கள் பின்வரும் ஆவணங்களை பதிவேற்ற வேண்டும்: 1) ஆதார் அட்டை (அடையாளம் மற்றும் வயது சான்று), 2) வட்டாட்சியரால் வழங்கப்பட்ட வருமானச் சான்றிதழ் (கடந்த 1 வருடத்திற்குள் பெறப்பட்டது), 3) சாதிச் சான்றிதழ் (இடஒதுக்கீடு கோருவோருக்கு), 4) இருப்பிடச் சான்றிதழ், 5) மாற்றுத்திறனாளி அல்லது முன்னாள் ராணுவத்தினர் சான்றிதழ் (பொருந்துமானால்).",
    source: "தமிழ்நாடு வீட்டு வசதி வாரிய ஆவண சரிபார்ப்பு பட்டியல், பிரிவு 3.1"
  },
  {
    id: "kb_waitlist_en",
    lang: "en",
    category: "waitlist",
    title: "Waitlist Operation & Estimated Wait Times",
    content: "When schemes are oversubscribed, eligible applicants not allotted in the primary draw are placed on the Explainable Waitlist sorted by priority score. The estimated wait time is calculated as (Applicants Ahead ÷ Recent Monthly Vacancy Rate). Ranks advance automatically whenever an allotted applicant cancels, declines, or fails to make payment within the SLA window.",
    source: "TNHB Waitlist & Vacancy Protocols, Section 4.3"
  },
  {
    id: "kb_waitlist_ta",
    lang: "ta",
    category: "waitlist",
    title: "காத்திருப்பு பட்டியல் மற்றும் உத்தேச காத்திருப்பு காலம்",
    content: "திட்டத்தில் வீடுகள் தீர்ந்துவிட்டால், தகுதியுள்ள விண்ணப்பதாரர்கள் முன்னுரிமை மதிப்பெண் அடிப்படையில் காத்திருப்பு பட்டியலில் வைக்கப்படுகிறார்கள். உத்தேச காத்திருப்பு காலம் = (உங்களுக்கு முன்னால் உள்ள விண்ணப்பதாரர்கள் எண்ணிக்கை ÷ மாதாந்திர காலி இடங்களின் சராசரி விகிதம்). ஒதுக்கீடு பெற்றவர் ரத்து செய்தாலோ அல்லது காலக்கெடுவிற்குள் கட்டணம் செலுத்தாவிட்டாலோ, அடுத்தவருக்கு தானாக வீடு ஒதுக்கப்படும்.",
    source: "தமிழ்நாடு வீட்டு வசதி வாரிய காத்திருப்பு நெறிமுறை, பிரிவு 4.3"
  },
  {
    id: "kb_sla_en",
    lang: "en",
    category: "sla",
    title: "Offer SLA Timers & Auto-Promotion",
    content: "When a housing unit is allotted, the beneficiary is granted an allotment offer with a strict 72-hour deadline to accept and complete booking formalities. If the applicant declines or the timer expires, the offer is withdrawn automatically, and the system promotes the top-ranked applicant from the waitlist without manual intervention.",
    source: "TNHB SLA & Fast-Track Allotment Policy, Section 5.1"
  },
  {
    id: "kb_sla_ta",
    lang: "ta",
    category: "sla",
    title: "ஒதுக்கீடு காலக்கெடு மற்றும் தானியங்கி பதவி உயர்வு",
    content: "வீடு ஒதுக்கீடு செய்யப்பட்டவுடன், விண்ணப்பதாரருக்கு 72 மணிநேர காலக்கெடு வழங்கப்படும். இந்த காலக்கெடுவிற்குள் சலுகையை ஏற்றுக்கொள்ளாவிட்டாலோ அல்லது நிராகரித்தாலோ, அந்த ஒதுக்கீடு ரத்து செய்யப்பட்டு, காத்திருப்பு பட்டியலில் முதல் இடத்தில் உள்ள அடுத்த விண்ணப்பதாரருக்கு உடனடியாக தானாக ஒதுக்கப்படும்.",
    source: "தமிழ்நாடு வீட்டு வசதி வாரிய வேக ஒதுக்கீடு கொள்கை, பிரிவு 5.1"
  }
];

/**
 * Detect language from text
 */
function isTamilText(text = "") {
  return /[\u0B80-\u0BFF]/.test(text);
}

/**
 * Perform keyword-based semantic chunk search
 */
function searchChunks(query, lang = "en") {
  const qLower = query.toLowerCase();
  const tokens = qLower.split(/\s+/).filter(t => t.length > 2);

  const scored = knowledgeBase.map(chunk => {
    let score = 0;
    // Prefer matching language
    if (chunk.lang === lang) score += 2;

    const fullContent = (chunk.title + " " + chunk.content + " " + chunk.category).toLowerCase();
    for (const token of tokens) {
      if (fullContent.includes(token)) score += 3;
    }
    return { chunk, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.filter(s => s.score > 0).slice(0, 2).map(s => s.chunk);
}

/**
 * Process incoming AI chatbot message with RAG context & user record
 */
export function processChatMessage(query, user, userApplications = [], forcedLang = null) {
  const lang = forcedLang || (isTamilText(query) ? "ta" : "en");
  const q = query.toLowerCase();

  // Intent classification
  const isStatusQuery = q.includes("status") || q.includes("rank") || q.includes("waitlist") || 
                        q.includes("my application") || q.includes("progress") || 
                        q.includes("நிலை") || q.includes("காத்திருப்பு") || q.includes("விண்ணப்பம்");

  const isOfficerEscalation = q.includes("officer") || q.includes("human") || q.includes("complaint") || 
                              q.includes("support") || q.includes("contact") || q.includes("அதிகாரி") || q.includes("புகார்");

  // 1. Officer Escalation Request
  if (isOfficerEscalation) {
    if (lang === "ta") {
      return {
        reply: "உங்கள் கோரிக்கை பதிவு செய்யப்பட்டுள்ளது. உதவி கோரிக்கையை சமர்ப்பிக்க கீழே உள்ள 'அதிகாரியிடம் பேசுங்கள்' பொத்தானைப் பயன்படுத்தலாம். எங்கள் சரிபார்ப்பு அதிகாரி உங்கள் விண்ணப்பத்தை ஆய்வு செய்து அழைப்பார்.",
        source: "TNHB Citizen Support Cell",
        intent: "escalation",
        language: "ta",
        ticketOffered: true
      };
    } else {
      return {
        reply: "I understand you would like to speak directly with an officer. You can raise a formal clarification ticket using the 'Talk to Officer' option below. An allotment desk officer will review your record.",
        source: "TNHB Citizen Helpdesk",
        intent: "escalation",
        language: "en",
        ticketOffered: true
      };
    }
  }

  // 2. Personal Status Query (Grounding with authenticated user's record)
  if (isStatusQuery && user) {
    const activeApp = userApplications[0];

    if (!activeApp) {
      if (lang === "ta") {
        return {
          reply: `வணக்கம் ${user.name}! உங்கள் கணக்கில் தற்போது செயல்பாட்டில் உள்ள விண்ணப்பங்கள் எதுவும் இல்லை. 'Apply for Scheme' பக்கத்தில் புதிய திட்டத்திற்கு விண்ணப்பிக்கலாம்.`,
          source: "TNHB Live Portal Database",
          intent: "status",
          language: "ta"
        };
      } else {
        return {
          reply: `Hello ${user.name}! You do not currently have any active housing applications submitted. You can browse active housing schemes and apply directly from your dashboard.`,
          source: "TNHB Live Application Records",
          intent: "status",
          language: "en"
        };
      }
    }

    // Construct personalized explanation based on actual status
    if (lang === "ta") {
      let statusDesc = "";
      if (activeApp.status === "Waitlisted") {
        statusDesc = `நீங்கள் தற்போது ${activeApp.schemeName} திட்டத்திற்கான காத்திருப்பு பட்டியலில் உள்ளீர்கள். உங்கள் காத்திருப்பு எண்: **${activeApp.waitlistRank || 'WL-Active'}**. உங்கள் முன்னுரிமை மதிப்பெண்: **${activeApp.score || 0} புள்ளிகள்**. காலி இடங்கள் ஏற்படும்போது உங்கள் தரவரிசை தானாக முன்னகரும்.`;
      } else if (activeApp.status === "Allotted") {
        statusDesc = `வாழ்த்துகள்! உங்களுக்கு ${activeApp.schemeName} திட்டத்தில் வீடு ஒதுக்கப்பட்டுள்ளது! (Unit: ${activeApp.allottedUnitId || 'Assigned'}). தயவுசெய்து உங்கள் Allotment Order-ஐ சரிபார்த்து கட்டணத்தை முடிக்கவும்.`;
      } else if (activeApp.status === "Payment Pending" || activeApp.status === "Payment Verified") {
        statusDesc = `உங்கள் விண்ணப்பம் (${activeApp.id}) சமர்ப்பிக்கப்பட்டு கட்டணம்/ஆவண சரிபார்ப்பு நிலையில் உள்ளது. தற்போதைய நிலை: **${activeApp.status}**.`;
      } else {
        statusDesc = `உங்கள் விண்ணப்பத்தின் தற்போதைய நிலை: **${activeApp.status}**.`;
      }

      return {
        reply: `வணக்கம் ${user.name}! ${statusDesc}`,
        source: `நேரடி தரவுத்தளம்: விண்ணப்ப எண் ${activeApp.id}`,
        intent: "status",
        language: "ta",
        applicationData: {
          id: activeApp.id,
          status: activeApp.status,
          score: activeApp.score,
          rank: activeApp.waitlistRank
        }
      };
    } else {
      let statusDesc = "";
      if (activeApp.status === "Waitlisted") {
        statusDesc = `You are currently on the Waitlist for **${activeApp.schemeName}** at rank **${activeApp.waitlistRank || 'WL-001'}**. Your computed priority score is **${activeApp.score || 0} points**. As vacancies arise or offers expire, your position will advance automatically.`;
      } else if (activeApp.status === "Allotted") {
        statusDesc = `🎉 Congratulations! A housing unit has been allotted to you in **${activeApp.schemeName}** under ${activeApp.allotmentReason || 'General Pool'}. Please view and download your cryptographically verified Allotment Order on your dashboard.`;
      } else if (activeApp.status === "Payment Pending" || activeApp.status === "Payment Verified") {
        statusDesc = `Your application for **${activeApp.schemeName}** is in **${activeApp.status}** stage. Next step: Document verification by the desk officer.`;
      } else {
        statusDesc = `Your application for **${activeApp.schemeName}** is currently marked as **${activeApp.status}**.`;
      }

      return {
        reply: `Hello ${user.name}! ${statusDesc}`,
        source: `Live Database Record for Application #${activeApp.id}`,
        intent: "status",
        language: "en",
        applicationData: {
          id: activeApp.id,
          status: activeApp.status,
          score: activeApp.score,
          rank: activeApp.waitlistRank
        }
      };
    }
  }

  // 3. RAG Search over Housing Board Knowledge Chunks
  const relevantChunks = searchChunks(query, lang);

  if (relevantChunks.length > 0) {
    const primary = relevantChunks[0];
    const secondary = relevantChunks[1];

    let replyText = primary.content;
    if (secondary && secondary.category !== primary.category) {
      replyText += `\n\n${secondary.content}`;
    }

    return {
      reply: replyText,
      source: primary.source + (secondary ? ` & ${secondary.source}` : ""),
      intent: "policy_rag",
      language: lang,
      chunksUsed: [primary.id, secondary?.id].filter(Boolean)
    };
  }

  // 4. Fallback when outside knowledge base scope
  if (lang === "ta") {
    return {
      reply: "மன்னிக்கவும், உங்கள் கேள்வி வீட்டு வசதி வாரியத்தின் அதிகாரப்பூர்வ விதிமுறைகளில் கண்டறியப்படவில்லை. விரிவான தகவலுக்கு எங்கள் உதவி மையத்தை அணுகலாம் அல்லது 'அதிகாரியிடம் பேசுங்கள்' விருப்பத்தைப் பயன்படுத்தலாம்.",
      source: "TNHB Guidelines Assistant",
      intent: "fallback",
      language: "ta",
      ticketOffered: true
    };
  } else {
    return {
      reply: "I could not find an exact match in the approved Housing Board policy guidelines for this query. As an AI assistant, I only provide information from verified board regulations. Would you like to raise a query with a desk officer?",
      source: "TNHB Guidelines Assistant",
      intent: "fallback",
      language: "en",
      ticketOffered: true
    };
  }
}
