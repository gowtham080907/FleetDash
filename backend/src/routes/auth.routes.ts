import { Router, Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/auth/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/auth/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password, role, department } = req.body;
    const result = await authService.register(name, email, password, role, department);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/auth/logout', (_req: Request, res: Response) => {
  res.status(200).json({ success: true, message: 'Logged out successfully' });
});

router.get('/auth/me', authenticate, (req: Request, res: Response) => {
  res.status(200).json({ user: req.user });
});

export const authRouter = router;

