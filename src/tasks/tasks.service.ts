import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateTaskDto, ListTasksQuery, UpdateTaskDto } from './dto/task.dto';
import { Task, TaskPriority, TaskStatus } from './task.entity';

@Injectable()
export class TasksService {
  constructor(@InjectRepository(Task) private readonly tasks: Repository<Task>) {}

  create(ownerId: string, dto: CreateTaskDto) {
    return this.tasks.save(
      this.tasks.create({
        title: dto.title,
        description: dto.description ?? null,
        status: dto.status ?? TaskStatus.TODO,
        priority: dto.priority ?? TaskPriority.MEDIUM,
        dueDate: dto.dueDate ?? null,
        ownerId,
      }),
    );
  }

  async list(ownerId: string, query: ListTasksQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const qb = this.tasks
      .createQueryBuilder('t')
      .where('t.ownerId = :ownerId', { ownerId })
      .orderBy('t.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.status) qb.andWhere('t.status = :status', { status: query.status });
    if (query.priority) qb.andWhere('t.priority = :priority', { priority: query.priority });
    if (query.search) {
      qb.andWhere('(LOWER(t.title) LIKE :s OR LOWER(t.description) LIKE :s)', { s: `%${query.search.toLowerCase()}%` });
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) };
  }

  async findOne(ownerId: string, id: string) {
    const task = await this.tasks.findOne({ where: { id, ownerId } });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async update(ownerId: string, id: string, dto: UpdateTaskDto) {
    const task = await this.findOne(ownerId, id);
    Object.assign(task, dto);
    return this.tasks.save(task);
  }

  async remove(ownerId: string, id: string) {
    const task = await this.findOne(ownerId, id);
    await this.tasks.remove(task);
  }

  async stats(ownerId: string) {
    const rows = await this.tasks
      .createQueryBuilder('t')
      .select('t.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('t.ownerId = :ownerId', { ownerId })
      .groupBy('t.status')
      .getRawMany<{ status: TaskStatus; count: string }>();

    const byStatus = { todo: 0, in_progress: 0, done: 0 } as Record<TaskStatus, number>;
    for (const r of rows) byStatus[r.status] = Number(r.count);
    const total = Object.values(byStatus).reduce((a, b) => a + b, 0);
    return { total, byStatus, completionRate: total ? Math.round((byStatus.done / total) * 100) : 0 };
  }
}
