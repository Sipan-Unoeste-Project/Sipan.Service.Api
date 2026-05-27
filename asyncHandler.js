/**
 * Permite usar handlers async sem try/catch; erros viram próximo middleware do Express.
 * @template {import('express').Request} Req
 * @template {import('express').Response} Res
 * @param {(req: Req, res: Res, next: import('express').NextFunction) => Promise<void>} fn
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
