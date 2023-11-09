export const sendEmail = (
  toAddress: string,
  subject: string,
  messageLines: Array<string>
) => {
  // const transporter = nodemailer.createTransport({
  //   service: process.env.EMAIL_SERVICE,
  //   auth: {
  //     user: process.env.EMAIL_ADDRESS,
  //     pass: process.env.EMAIL_PASSWORD,
  //   },
  // });

  // const mailOptions = {
  //   from: process.env.EMAIL_ADDRESS,
  //   to: toAddress,
  //   subject,
  //   text: messageLines.join("\n\n"),
  // };

  // return new Promise((resolve, reject) => {
  //   transporter.sendMail(mailOptions, (error, info) => {
  //     if (error) {
  //       reject(error);
  //     } else {
  //       resolve(undefined);
  //     }
  //   });
  // });
  return true;
};
