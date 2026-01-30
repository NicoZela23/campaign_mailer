const dns = require('dns');
const { promisify } = require('util');

const resolveMx = promisify(dns.resolveMx);
const resolve4 = promisify(dns.resolve4);

const extractDomain = (email) => {
  if (!email || typeof email !== 'string') {
    return null;
  }
  const parts = email.split('@');
  if (parts.length !== 2) {
    return null;
  }
  return parts[1].toLowerCase().trim();
};

const checkMxRecords = async (domain) => {
  try {
    const mxRecords = await resolveMx(domain);
    if (!mxRecords || mxRecords.length === 0) {
      try {
        await resolve4(domain);
        return { valid: true, mxRecords: [], fallback: 'A' };
      } catch (aError) {
        return { 
          valid: false, 
          error: `No MX or A records found for domain ${domain}` 
        };
      }
    }
    return { valid: true, mxRecords };
  } catch (error) {
    if (['ENOTFOUND', 'ENODATA', 'NXDOMAIN'].includes(error.code)) {
      return { 
        valid: false, 
        error: `Domain not found (${error.code}): ${domain}` 
      };
    }
    return { 
      valid: false, 
      error: `DNS check failed: ${error.message}` 
    };
  }
};

const validateEmailDNS = async (email) => {
  const domain = extractDomain(email);
  if (!domain) {
    return {
      valid: false,
      error: 'Invalid email format'
    };
  }
  
  const mxCheck = await checkMxRecords(domain);
  if (!mxCheck.valid) {
    return {
      valid: false,
      domain,
      error: mxCheck.error
    };
  }
  
  return {
    valid: true,
    domain,
    mxRecords: mxCheck.mxRecords
  };
};

module.exports = { validateEmailDNS };
