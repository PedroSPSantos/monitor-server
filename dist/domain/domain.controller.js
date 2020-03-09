"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const domain_service_1 = require("./domain.service");
const response_1 = require("../lib/response");
let DomainController = class DomainController {
    constructor(domainService) {
        this.domainService = domainService;
    }
    async getAllDomains() {
        return response_1.success(await this.domainService.findAll());
    }
    async getAllOfficialDomains() {
        return response_1.success(await this.domainService.findAllOfficial());
    }
    async checkIfDomainExists(url) {
        return response_1.success(!!await this.domainService.findByUrl(decodeURIComponent(url)));
    }
    async getMyMonitorUserWebsiteDomain(req, website) {
        return response_1.success(await this.domainService.findMyMonitorUserWebsiteDomain(req.user.userId, website));
    }
    async getStudyMonitorUserTagWebsiteDomain(req, tag, website) {
        return response_1.success(await this.domainService.findStudyMonitorUserTagWebsiteDomain(req.user.userId, tag, website));
    }
};
__decorate([
    common_1.UseGuards(passport_1.AuthGuard('jwt-admin')),
    common_1.Get('all'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DomainController.prototype, "getAllDomains", null);
__decorate([
    common_1.UseGuards(passport_1.AuthGuard('jwt-admin')),
    common_1.Get('allOfficial'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DomainController.prototype, "getAllOfficialDomains", null);
__decorate([
    common_1.UseGuards(passport_1.AuthGuard('jwt-admin')),
    common_1.Get('exists/:url'),
    __param(0, common_1.Param('url')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DomainController.prototype, "checkIfDomainExists", null);
__decorate([
    common_1.UseGuards(passport_1.AuthGuard('jwt-monitor')),
    common_1.Get('myMonitor/website/:website'),
    __param(0, common_1.Request()), __param(1, common_1.Param('website')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], DomainController.prototype, "getMyMonitorUserWebsiteDomain", null);
__decorate([
    common_1.UseGuards(passport_1.AuthGuard('jwt-study')),
    common_1.Get('studyMonitor/tag/:tag/website/:website'),
    __param(0, common_1.Request()), __param(1, common_1.Param('tag')), __param(2, common_1.Param('website')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], DomainController.prototype, "getStudyMonitorUserTagWebsiteDomain", null);
DomainController = __decorate([
    common_1.Controller('domain'),
    __metadata("design:paramtypes", [domain_service_1.DomainService])
], DomainController);
exports.DomainController = DomainController;
//# sourceMappingURL=domain.controller.js.map