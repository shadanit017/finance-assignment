import { Controller, Get, Post, Delete, Body, Req, UseGuards, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AssistantService } from './assistant.service';
import { AskQuestionDto } from './dto/ask-assistant.dto';
import { AuthenticatedGuard } from '../auth/guards/authenticated.guard';

@ApiTags('Assistant')
@Controller('assistant')
@UseGuards(AuthenticatedGuard)
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

  @Get('history')
  @ApiOperation({ summary: 'Get user chat discussion history from database' })
  @ApiResponse({ status: 401, description: 'Unauthorized if user is not logged in' })
  async getChatHistory(@Req() req: any) {
    if (!req.user || !req.user.id) {
      throw new UnauthorizedException('Authentication required. Please log in to access chat history.');
    }
    return this.assistantService.getChatHistory(req.user.id);
  }

  @Delete('history')
  @ApiOperation({ summary: 'Clear user chat discussion history in database' })
  @ApiResponse({ status: 401, description: 'Unauthorized if user is not logged in' })
  async clearChatHistory(@Req() req: any) {
    if (!req.user || !req.user.id) {
      throw new UnauthorizedException('Authentication required. Please log in to clear chat history.');
    }
    await this.assistantService.clearChatHistory(req.user.id);
    return { success: true, message: 'Chat history cleared' };
  }


  @Post('ask')
  @ApiOperation({
    summary: 'Full End-to-End AI Assistant Question Execution & Answer Synthesis',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns grounded natural language answer, queryPlan, DB result rows, and RBAC-compliant evidence',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized if user is not logged in' })
  @ApiResponse({ status: 403, description: 'Forbidden if user role lacks required capabilities' })
  async askQuestion(
    @Body() dto: AskQuestionDto,
    @Req() req: any,
  ) {
    if (!req.user || !req.user.id) {
      throw new UnauthorizedException('Authentication required. Please log in to ask financial questions.');
    }
    const userId = req.user.id;
    const roleName = req.user.role?.name || 'Viewer';
    const subject = this.resolveSubjectFromSession(req);
    return this.assistantService.processQuestion(dto.question, subject, userId, roleName);
  }

  private resolveSubjectFromSession(req: any): any {
    if (!req.user || !req.user.id) {
      throw new UnauthorizedException('Authentication required. Please log in to ask financial questions.');
    }
    return req.user.id;
  }
}
