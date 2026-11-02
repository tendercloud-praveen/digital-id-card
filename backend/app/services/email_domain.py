
import logging

import dns.exception
import dns.resolver

logger = logging.getLogger("tapcard.email")


def domain_accepts_email(domain: str) -> bool:
    """True when the domain publishes mail servers (MX records).

    A misspelled domain such as "gfmail.com" may exist as a parked website but
    has no mail servers, so a code sent there bounces and never arrives. If DNS
    cannot be reached (offline, timeout) the address is allowed rather than
    blocking registration.
    """
    try:
        answers = dns.resolver.resolve(domain, "MX", lifetime=5)
    except (dns.resolver.NXDOMAIN, dns.resolver.NoAnswer):
        return False
    except dns.exception.DNSException as error:
        logger.warning("MX lookup for %s failed (%s); allowing the address", domain, error.__class__.__name__)
        return True
    # A "null MX" (exchange ".") means the domain explicitly accepts no email.
    return any(str(record.exchange) not in (".", "") for record in answers)
