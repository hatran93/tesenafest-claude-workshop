import { BaseClient } from './BaseClient';
import type { CreateProjectPayload, Project, UpdateProjectPayload } from './types';

export class ProjectsClient extends BaseClient {
  async create(payload: CreateProjectPayload): Promise<Project> {
    return this.postJson<Project>('projects', payload);
  }

  async get(id: string): Promise<Project> {
    return this.getJson<Project>(`projects/${id}`);
  }

  async update(id: string, payload: UpdateProjectPayload): Promise<Project> {
    return this.postJson<Project>(`projects/${id}`, payload);
  }

  /** Deletes the project together with its tasks and comments. */
  async delete(id: string): Promise<void> {
    await this.deleteResource(`projects/${id}`);
  }

  /** All active (not archived) projects, across all pages. */
  async list(): Promise<Project[]> {
    return this.listAll<Project>('projects');
  }

  /**
   * Archives the project. Its tasks are kept.
   * The response body still shows `is_archived: false`; load the project to see the new state.
   */
  async archive(id: string): Promise<Project> {
    return this.postJson<Project>(`projects/${id}/archive`);
  }

  async unarchive(id: string): Promise<Project> {
    return this.postJson<Project>(`projects/${id}/unarchive`);
  }

  /** All archived projects, across all pages. */
  async listArchived(): Promise<Project[]> {
    return this.listAll<Project>('projects/archived');
  }
}
