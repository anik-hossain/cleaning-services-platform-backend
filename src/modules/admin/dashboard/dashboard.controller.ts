import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { CreateDashboardDto } from './dto/create-dashboard.dto';
import { UpdateDashboardDto } from './dto/update-dashboard.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { Role } from 'src/common/guard/role/role.enum';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { PaginationDto } from 'src/common/pagination/dto/offset-pagination.dto';
import { CleanerStatusDto } from './dto/cleaner-status.dto';
import { DangerStatusDto } from './dto/danger-status.dto';
import { JobStatusDto } from './dto/job-status.dto';
import { UpdateCommissionDto } from './dto/update-commission.dto';
import { Public } from 'src/common/decorator/public.decorator';
import { HomeownerActionsDto } from './dto/homeowner-actions.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) { }

  // dashborad Overview
  @Get('overview')
  async getOverview() {
    return this.dashboardService.getOverview();
  }

  // recent activities alias
  @Get('activities')
  async getActivitiesAlias(
    @Query() paginationDto: PaginationDto
  ) {
    return this.dashboardService.getActivities(paginationDto);
  }

  /*--------------------------------------------
            Commission with details
  --------------------------------------------*/

  // get all commission with details
  @Public()
  @Get('commissions')
  async getCommissions(
  ) {
    return this.dashboardService.getCommissions();
  }

  // update commission by id
  @Public()
  @Patch('commissions/:id')
  async updateCommissionById(
    @Param('id') id: string,
    @Body() updateCommissionDto: UpdateCommissionDto,
  ) {
    return this.dashboardService.updateCommissionById(id, updateCommissionDto);
  }



  /*--------------------------------------------
            HOMEOWNER LIST WITH DETAILS
  --------------------------------------------*/

  // get all homeowners with details
  @Get('homeowners/details')
  async getAllHomeowners(
    @Query() paginationDto: PaginationDto
  ) {
    return this.dashboardService.getAllHomeowners(paginationDto);
  }

  // Homer owner actions
  @Patch('/homeowners/actions')
  async homeownersActions(@Query() query: HomeownerActionsDto) {
    return this.dashboardService.homeownersActions(query)
  }

  /*--------------------------------------------
            Clearner LIST WITH DETAILS
  --------------------------------------------*/

  // get all cleaners with details
  @Get('cleaners/details')
  async getAllCleaners(
    @Query() paginationDto: PaginationDto
  ) {
    return this.dashboardService.getAllCleaners(paginationDto);
  }

  /*--------------------------------------------
            Booking  WITH DETAILS
  --------------------------------------------*/

  // get all bookings with details
  @Get('bookings/details')
  async getAllBookings(@Query() paginationDto: PaginationDto) {
    return this.dashboardService.getAllBookings(paginationDto);
  }

  /*--------------------------------------------
            Job Approval  WITH DETAILS
  --------------------------------------------*/

  // get all job approval
  @Get('job-approvals')
  async getAllJobApprovals(@Query() paginationDto: PaginationDto) {
    return this.dashboardService.getAllJobApprovals(paginationDto);
  }

  // approve or reject job approval by id
  @Patch('job-approvals/:id')
  async updateJobApprovalById(
    @Param('id') id: string,
    @Body() JobStatusDto: JobStatusDto,
  ) {
    return this.dashboardService.updateJobApprovalById(id, JobStatusDto);
  }

  /*--------------------------------------------
      Cleaner Requests with approve part 
  --------------------------------------------*/

  // get all cleaner requests with details
  @Get('cleaners/request')
  async getAllCleanerRequests(@Query() paginationDto: PaginationDto) {
    return this.dashboardService.getAllCleanerRequests(paginationDto);
  }

  // get cleaner deatils by id
  @Get('cleaners/request/:id')
  async getCleanerRequestById(@Param('id') id: string) {
    return this.dashboardService.getCleanerRequestById(id);
  }

  // approve or reject cleaner request by id
  @Patch('cleaners/request/:id')
  async updateCleanerRequestById(
    @Param('id') id: string,
    @Body() cleanerStatusDto: CleanerStatusDto,
  ) {
    return this.dashboardService.updateCleanerRequestById(id, cleanerStatusDto);
  }

  /*--------------------------------------------
      Cleaner Requests with approve part 
  --------------------------------------------*/
  /*--------------------------------------------
      Danger Requests with approve part 
   --------------------------------------------*/
  // get all danger requests with
  @Get('danger/request')
  async getAllDangerRequests(@Query() paginationDto: PaginationDto) {
    return this.dashboardService.getAllDangerRequests(paginationDto);
  }

  // get danger request by id
  @Get('danger/request/:id')
  async getDangerRequestById(@Param('id') id: string) {
    return this.dashboardService.getDangerRequestById(id);
  }

  // approve or reject danger request by id
  @Patch('danger/request/:id')
  async updateDangerRequestById(
    @Param('id') id: string,
    @Body() dangerStatusDto: DangerStatusDto,
  ) {
    return this.dashboardService.updateDangerRequestById(id, dangerStatusDto);
  }

  /*--------------------------------------------
      Danger Requests with approve part 
   --------------------------------------------*/
}











