import { Controller, InternalServerErrorException, Request, Get, Post, UseGuards, Param } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import * as SqlString from 'sqlstring';
import { WebsiteService } from './website.service';
import { Website } from './website.entity';
import { success } from '../lib/response';

@Controller('website')
export class WebsiteController {

  constructor(private readonly websiteService: WebsiteService) { }

  @UseGuards(AuthGuard('jwt-admin'))
  @Post('create')
  async createWebsite(@Request() req: any): Promise<any> {
    const website = new Website();
    website.Name = req.body.name;
    website.UserId = parseInt(SqlString.escape(req.body.userId)) || null;
    website.EntityId = parseInt(SqlString.escape(req.body.entityId)) || null;
    website.Creation_Date = new Date();

    const domain = decodeURIComponent(req.body.domain);
    const tags = JSON.parse(req.body.tags).map((tag: string) => SqlString.escape(tag));
    
    const createSuccess = await this.websiteService.createOne(website, domain, tags);
    if (!createSuccess) {
      throw new InternalServerErrorException();
    }

    return success(true);
  }

  @UseGuards(AuthGuard('jwt-admin'))
  @Get('all')
  async getAllWebsites(): Promise<any> {
    return success(await this.websiteService.findAll());
  }

  @UseGuards(AuthGuard('jwt-admin'))
  @Get('official')
  async getAllOfficialWebsites(): Promise<any> {
    return success(await this.websiteService.findAllOfficial());
  }

  @UseGuards(AuthGuard('jwt-admin'))
  @Get('withoutUser')
  async getWebsitesWithoutUser(): Promise<any> {
    return success(await this.websiteService.findAllWithoutUser());
  }

  @UseGuards(AuthGuard('jwt-admin'))
  @Get('withoutEntity')
  async getWebsitesWithoutEntity(): Promise<any> {
    return success(await this.websiteService.findAllWithoutEntity());
  }

  @UseGuards(AuthGuard('jwt-admin'))
  @Get('studyMonitor/total')
  async getNumberOfStudyMonitorUsers(): Promise<any> {
    return success(await this.websiteService.findNumberOfStudyMonitor());
  }

  @UseGuards(AuthGuard('jwt-admin'))
  @Get('myMonitor/total')
  async getNumberOfMyMonitorUsers(): Promise<any> {
    return success(await this.websiteService.findNumberOfMyMonitor());
  }

  @UseGuards(AuthGuard('jwt-admin'))
  @Get('observatory/total')
  async getNumberOfObservatoryTags(): Promise<any> {
    return success(await this.websiteService.findNumberOfObservatory());
  }

  @UseGuards(AuthGuard('jwt-admin'))
  @Get('exists/:name')
  async checkIfWebsiteExists(@Param('name') name: string): Promise<any> {
    return success(!!await this.websiteService.findByName(SqlString.escape(name)));
  }

  @UseGuards(AuthGuard('jwt-monitor'))
  @Get('myMonitor')
  async getMyMonitorUserWebsites(@Request() req: any): Promise<any> {
    return success(await this.websiteService.findAllFromMyMonitorUser(req.user.userId));
  }

  @UseGuards(AuthGuard('jwt-study'))
  @Get('studyMonitor/tag/:tag')
  async getStudyMonitorUserTagWebsites(@Request() req: any, @Param('tag') tag: string): Promise<any> {
    const userId = req.user.userId;
    return success(await this.websiteService.findAllFromStudyMonitorUserTag(userId, tag));
  }

  @UseGuards(AuthGuard('jwt-study'))
  @Get('studyMonitor/otherTags/:tag')
  async getStudyMonitorUserOtherTagsWebsites(@Request() req: any, @Param('tag') tag: string): Promise<any> {
    const userId = req.user.userId;
    return success(await this.websiteService.findAllFromStudyMonitorUserOtherTagsWebsites(userId, tag));
  }

  @UseGuards(AuthGuard('jwt-study'))
  @Get('studyMonitor/tag/:tag/website/nameExists/:website')
  async checkIfStudyMonitorUserTagWebsiteNameExists(@Request() req: any, @Param('tag') tag: string, @Param('website') website: string): Promise<any> {
    const userId = req.user.userId;
    return success(!!await this.websiteService.findStudyMonitorUserTagWebsiteByName(userId, tag, website));
  }

  @UseGuards(AuthGuard('jwt-study'))
  @Get('studyMonitor/tag/:tag/website/domainExists/:domain')
  async checkIfStudyMonitorUserTagWebsiteDomainExists(@Request() req: any, @Param('tag') tag: string, @Param('domain') domain: string): Promise<any> {
    const userId = req.user.userId;
    return success(!!await this.websiteService.findStudyMonitorUserTagWebsiteByDomain(userId, tag, domain));
  }

  @UseGuards(AuthGuard('jwt-study'))
  @Post('studyMonitor/link')
  async linkStudyMonitorUserTagWebsite(@Request() req: any): Promise<any> {
    const userId = req.user.userId;
    const tag = req.body.tag;
    const websitesId = JSON.parse(req.body.websitesId);
    
    const linkSuccess = await this.websiteService.linkStudyMonitorUserTagWebsite(userId, tag, websitesId);
    if (!linkSuccess) {
      throw new InternalServerErrorException();
    }

    return success(await this.websiteService.findAllFromStudyMonitorUserTag(userId, tag));
  }

  @UseGuards(AuthGuard('jwt-study'))
  @Post('studyMonitor/create')
  async createStudyMonitorUserTagWebsite(@Request() req: any): Promise<any> {
    const userId = req.user.userId;
    const tag = req.body.tag;
    const websiteName = req.body.name;
    const domain = decodeURIComponent(req.body.domain);
    const pages = JSON.parse(req.body.pages).map((page: string) => decodeURIComponent(page));
    
    const createSuccess = await this.websiteService.createStudyMonitorUserTagWebsite(userId, tag, websiteName, domain, pages);
    if (!createSuccess) {
      throw new InternalServerErrorException();
    }

    return success(await this.websiteService.findAllFromStudyMonitorUserTag(userId, tag));
  }

  @UseGuards(AuthGuard('jwt-study'))
  @Post('studyMonitor/remove')
  async removeStudyMonitorUserTagWebsite(@Request() req: any): Promise<any> {
    const userId = req.user.userId;
    const tag = req.body.tag;
    const websitesId = JSON.parse(req.body.websitesId);
    
    const removeSuccess = await this.websiteService.removeStudyMonitorUserTagWebsite(userId, tag, websitesId);
    if (!removeSuccess) {
      throw new InternalServerErrorException();
    }

    return success(await this.websiteService.findAllFromStudyMonitorUserTag(userId, tag));
  }
}
