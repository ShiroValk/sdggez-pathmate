import { Controller, Get, NotFoundException, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

@Controller()
export class ViewController {

  @Get(['/', '*'])
  render(@Req() req: Request, @Res() res: Response): void {
    // Unknown API and asset paths must retain a 404 instead of receiving SPA HTML.
    if (req.path === '/api' || req.path.startsWith('/api/') || req.path === '/assets' || req.path.startsWith('/assets/') || /\.[a-z0-9]+$/i.test(req.path)) {
      throw new NotFoundException();
    }
    const entry = join(process.cwd(), 'dist/client/index.html');
    if (!existsSync(entry)) throw new NotFoundException('Run npm run build, or open the Vite development server at http://127.0.0.1:5173.');
    res.sendFile(entry);
  }
}
