import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isDuplicateTicket(ticket: any, activeTickets: any[]) {
  if (!ticket || !activeTickets || !Array.isArray(activeTickets)) return false

  const ticketDate = ticket.data_ocorrencia
  const ticketCar = ticket.carro

  if (!ticketDate || !ticketCar) return false

  return activeTickets.some((other) => {
    if (other.id === ticket.id) return false

    if (!other.data_ocorrencia || other.data_ocorrencia !== ticketDate) return false

    const otherCar = other.carro
    const otherTitle = other.titulo || ''
    const ticketTitle = ticket.titulo || ''

    const isExactCarMatch = !!(otherCar && otherCar === ticketCar)
    const isTicketCarInOtherTitle = !!(ticketCar && otherTitle.includes(ticketCar))
    const isOtherCarInTicketTitle = !!(otherCar && ticketTitle.includes(otherCar))

    return isExactCarMatch || isTicketCarInOtherTitle || isOtherCarInTicketTitle
  })
}
