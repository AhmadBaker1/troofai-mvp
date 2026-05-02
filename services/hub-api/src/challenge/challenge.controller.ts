import { Controller, Post, Param } from '@nestjs/common';
import { ChallengeService } from './challenge.service';

@Controller('challenges')
export class ChallengeController {
  constructor(private challengeService: ChallengeService) {}

  @Post('meeting/:meetingId')
  async triggerChallenge(@Param('meetingId') meetingId: string) {
    const results = await this.challengeService.issueChallenge(meetingId);
    return { success: true, results };
  }
}
