import winston, { format, transports } from 'winston';

export default winston.createLogger({
  format: format.combine(format.timestamp(), format.json()),
  transports: new transports.Console()
});
