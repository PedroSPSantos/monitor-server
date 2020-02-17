import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EntityService } from './entity.service';
import { EntityTable } from './entity.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EntityTable])],
  exports: [EntityService],
  providers: [EntityService]
})
export class EntityModule {}
