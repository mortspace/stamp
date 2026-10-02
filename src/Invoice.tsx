import { Fragment, type Ref } from 'react'
import { PrintMark, type PrintData } from './PrintMark'
import type { StampInvoice, StampIssuer } from './types'

type InvoiceProps = {
  invoice: StampInvoice
  issuer: StampIssuer
  print: PrintData | null
  zoom: number
  variant: string
  ref?: Ref<HTMLDivElement>
  printRef?: Ref<SVGSVGElement>
}

export function Invoice({ invoice, issuer, print, zoom, variant, ref, printRef }: InvoiceProps) {
  return (
    <div ref={ref} className="stp-sheet" style={{ zoom }}>
      <div className="stp-inv-title">Invoice</div>
      <div className="stp-inv-from">{issuer.name}</div>
      {issuer.logo && <div className="stp-inv-logo">{issuer.logo}</div>}
      <dl className="stp-inv-meta is-left">
        {issuer.details.map(({ label, value }) => (
          <Fragment key={label}>
            <dt>{`${label}:`}</dt>
            <dd>{value}</dd>
          </Fragment>
        ))}
      </dl>
      <dl className="stp-inv-meta is-right">
        <dt>Invoice to:</dt>
        <dd>{invoice.client}</dd>
        <dt>Invoice ID:</dt>
        <dd>{invoice.id}</dd>
        <dt>Date of issue:</dt>
        <dd>{invoice.issued}</dd>
        <dt>Payment due:</dt>
        <dd>{invoice.due}</dd>
      </dl>
      <div className="stp-inv-rule is-meta" />
      <div className="stp-inv-h2">Description of services</div>
      <table className="stp-inv-table">
        <thead>
          <tr>
            <th>Description</th>
            <th>Quantity</th>
            <th>Unit price</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {invoice.lines.map((line) => (
            <tr key={line.description}>
              <td>{line.description}</td>
              <td>{line.quantity}</td>
              <td>{line.unitPrice}</td>
              <td>{line.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="stp-inv-total">
        <span>Total amount due:</span>
        <strong>{invoice.total}</strong>
      </div>
      <div className="stp-inv-rule is-total" />
      <div className="stp-inv-bank">
        <b>Bank details for payment:</b>
        {issuer.payment.map(({ label, value }) => (
          <div key={label}>{`${label}: ${value}`}</div>
        ))}
      </div>
      <div className="stp-inv-foot">
        <span>Thank you for your business.</span>
        {issuer.website && <span>{issuer.website}</span>}
      </div>
      {print && <PrintMark ref={printRef} print={print} variant={variant} />}
    </div>
  )
}
