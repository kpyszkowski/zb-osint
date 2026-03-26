import tls from 'node:tls'
import { type Probe, extractDomain } from '../types.js'

export const sslProbe: Probe = async (url) => {
  const domain = extractDomain(url)

  return new Promise((resolve) => {
    const socket = tls.connect(443, domain, { servername: domain }, () => {
      const cert = socket.getPeerCertificate()
      const protocol = socket.getProtocol()

      socket.destroy()

      resolve({
        name: 'SSL/TLS Certificate',
        data: {
          subject: cert.subject,
          issuer: cert.issuer,
          validFrom: cert.valid_from,
          validTo: cert.valid_to,
          serialNumber: cert.serialNumber,
          fingerprint: cert.fingerprint256,
          protocol,
          bits: cert.bits,
          subjectAltNames: cert.subjectaltname,
        },
      })
    })

    socket.on('error', (e) => {
      resolve({ name: 'SSL/TLS Certificate', data: null, error: String(e) })
    })

    socket.setTimeout(10000, () => {
      socket.destroy()
      resolve({ name: 'SSL/TLS Certificate', data: null, error: 'Timeout' })
    })
  })
}
