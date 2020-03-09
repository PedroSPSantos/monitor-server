import { TagService } from './tag.service';
export declare class TagController {
    private readonly tagService;
    constructor(tagService: TagService);
    createOfficialTag(req: any): Promise<any>;
    createStudyMonitorUserTag(req: any): Promise<any>;
    removeStudyMonitorUserTag(req: any): Promise<any>;
    checkIfTagNameExists(tagName: string): Promise<boolean>;
    getAllTags(): Promise<any>;
    getAllOfficialTags(): Promise<any>;
    getNumberOfStudyMonitorUsers(): Promise<any>;
    getNumberOfObservatoryTags(): Promise<any>;
    getStudyMonitorUserTags(req: any): Promise<any>;
    getStudyMonitorUserTagData(req: any, tag: string): Promise<any>;
    getStudyMonitorUserTagWebsitesPagesData(req: any, tag: string, website: string): Promise<any>;
}
