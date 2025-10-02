'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Mail,
  Phone,
  Linkedin,
  Building2,
  ChevronDown,
  ChevronRight,
  User,
  Calendar,
} from 'lucide-react';
import Link from 'next/link';

interface Contact {
  id: string;
  trust_code: string;
  full_name: string;
  job_title: string | null;
  department: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  is_decision_maker: boolean;
  is_influencer: boolean;
  is_champion: boolean;
  preferred_contact_method: string | null;
  last_contact_date: string | null;
  contact_stage: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface TrustAccount {
  trust_code: string;
  trust_name: string;
}

interface GroupedContacts {
  [trustCode: string]: {
    trust_name: string;
    contacts: Contact[];
  };
}

export default function ContactsPage() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [accounts, setAccounts] = useState<TrustAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [trustFilter, setTrustFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('last_contact');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [expandedTrusts, setExpandedTrusts] = useState<Set<string>>(new Set());

  // Form state
  const [formData, setFormData] = useState({
    trust_code: '',
    full_name: '',
    job_title: '',
    department: '',
    email: '',
    phone: '',
    linkedin_url: '',
    is_decision_maker: false,
    is_influencer: false,
    is_champion: false,
    preferred_contact_method: 'email',
    notes: '',
  });

  useEffect(() => {
    fetchContacts();
    fetchAccounts();
  }, []);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/crm/contacts');
      const result = await response.json();

      if (result.data) {
        setContacts(result.data);
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/crm/accounts');
      const result = await response.json();

      if (result.data) {
        setAccounts(
          result.data.map((acc: any) => ({
            trust_code: acc.trust_code,
            trust_name: acc.trust_name,
          }))
        );
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingContact
        ? `/api/crm/contacts/${editingContact.id}`
        : '/api/crm/contacts';

      const method = editingContact ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.data) {
        await fetchContacts();
        setIsDialogOpen(false);
        resetForm();
      }
    } catch (error) {
      console.error('Error saving contact:', error);
    }
  };

  const handleDelete = async (contactId: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;

    try {
      await fetch(`/api/crm/contacts/${contactId}`, {
        method: 'DELETE',
      });

      await fetchContacts();
    } catch (error) {
      console.error('Error deleting contact:', error);
    }
  };

  const openEditDialog = (contact: Contact) => {
    setEditingContact(contact);
    setFormData({
      trust_code: contact.trust_code,
      full_name: contact.full_name,
      job_title: contact.job_title || '',
      department: contact.department || '',
      email: contact.email || '',
      phone: contact.phone || '',
      linkedin_url: contact.linkedin_url || '',
      is_decision_maker: contact.is_decision_maker || false,
      is_influencer: contact.is_influencer || false,
      is_champion: contact.is_champion || false,
      preferred_contact_method: contact.preferred_contact_method || 'email',
      notes: contact.notes || '',
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingContact(null);
    setFormData({
      trust_code: '',
      full_name: '',
      job_title: '',
      department: '',
      email: '',
      phone: '',
      linkedin_url: '',
      is_decision_maker: false,
      is_influencer: false,
      is_champion: false,
      preferred_contact_method: 'email',
      notes: '',
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadges = (contact: Contact) => {
    const badges = [];
    if (contact.is_decision_maker) badges.push({ label: 'Decision Maker', variant: 'default' });
    if (contact.is_influencer) badges.push({ label: 'Influencer', variant: 'secondary' });
    if (contact.is_champion) badges.push({ label: 'Champion', variant: 'success' });
    return badges;
  };

  const getDaysSinceContact = (date: string | null) => {
    if (!date) return null;
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const toggleTrust = (trustCode: string) => {
    const newExpanded = new Set(expandedTrusts);
    if (newExpanded.has(trustCode)) {
      newExpanded.delete(trustCode);
    } else {
      newExpanded.add(trustCode);
    }
    setExpandedTrusts(newExpanded);
  };

  // Filter and sort contacts
  const filteredContacts = contacts.filter((contact) => {
    const matchesSearch =
      contact.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.job_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTrust = trustFilter === 'all' || contact.trust_code === trustFilter;

    const matchesRole =
      roleFilter === 'all' ||
      (roleFilter === 'decision_maker' && contact.is_decision_maker) ||
      (roleFilter === 'influencer' && contact.is_influencer) ||
      (roleFilter === 'champion' && contact.is_champion);

    const matchesStage = stageFilter === 'all' || contact.contact_stage === stageFilter;

    return matchesSearch && matchesTrust && matchesRole && matchesStage;
  });

  // Sort contacts
  const sortedContacts = [...filteredContacts].sort((a, b) => {
    if (sortBy === 'last_contact') {
      const aDate = a.last_contact_date ? new Date(a.last_contact_date).getTime() : 0;
      const bDate = b.last_contact_date ? new Date(b.last_contact_date).getTime() : 0;
      return bDate - aDate;
    }
    return a.full_name.localeCompare(b.full_name);
  });

  // Group by trust
  const groupedContacts: GroupedContacts = sortedContacts.reduce((acc, contact) => {
    const trustName =
      accounts.find((acc) => acc.trust_code === contact.trust_code)?.trust_name ||
      contact.trust_code;

    if (!acc[contact.trust_code]) {
      acc[contact.trust_code] = {
        trust_name: trustName,
        contacts: [],
      };
    }

    acc[contact.trust_code].contacts.push(contact);
    return acc;
  }, {} as GroupedContacts);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#005eb8] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading contacts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Contact Directory</h1>
          <p className="text-gray-600 mt-1">
            {filteredContacts.length} of {contacts.length} contacts
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Contact
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingContact ? 'Edit Contact' : 'Add New Contact'}
              </DialogTitle>
              <DialogDescription>
                {editingContact
                  ? 'Update contact information below'
                  : 'Fill in the contact details below'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Trust Selection */}
              <div className="space-y-2">
                <Label htmlFor="trust_code">
                  NHS Trust <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.trust_code}
                  onValueChange={(value) => setFormData({ ...formData, trust_code: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a trust" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.trust_code} value={account.trust_code}>
                        {account.trust_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="full_name">
                  Full Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                />
              </div>

              {/* Job Title */}
              <div className="space-y-2">
                <Label htmlFor="job_title">
                  Job Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="job_title"
                  value={formData.job_title}
                  onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                  required
                />
              </div>

              {/* Department */}
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">
                  Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              {/* LinkedIn */}
              <div className="space-y-2">
                <Label htmlFor="linkedin_url">LinkedIn URL</Label>
                <Input
                  id="linkedin_url"
                  type="url"
                  value={formData.linkedin_url}
                  onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                  placeholder="https://linkedin.com/in/..."
                />
              </div>

              {/* Role Classification */}
              <div className="space-y-2">
                <Label>Role Classification</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="decision_maker"
                      checked={formData.is_decision_maker}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, is_decision_maker: checked as boolean })
                      }
                    />
                    <Label htmlFor="decision_maker" className="font-normal cursor-pointer">
                      Decision Maker
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="influencer"
                      checked={formData.is_influencer}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, is_influencer: checked as boolean })
                      }
                    />
                    <Label htmlFor="influencer" className="font-normal cursor-pointer">
                      Influencer
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="champion"
                      checked={formData.is_champion}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, is_champion: checked as boolean })
                      }
                    />
                    <Label htmlFor="champion" className="font-normal cursor-pointer">
                      Champion (Internal Advocate)
                    </Label>
                  </div>
                </div>
              </div>

              {/* Preferred Contact Method */}
              <div className="space-y-2">
                <Label>Preferred Contact Method</Label>
                <RadioGroup
                  value={formData.preferred_contact_method}
                  onValueChange={(value) =>
                    setFormData({ ...formData, preferred_contact_method: value })
                  }
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="email" id="method_email" />
                    <Label htmlFor="method_email" className="font-normal cursor-pointer">
                      Email
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="phone" id="method_phone" />
                    <Label htmlFor="method_phone" className="font-normal cursor-pointer">
                      Phone
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="linkedin" id="method_linkedin" />
                    <Label htmlFor="method_linkedin" className="font-normal cursor-pointer">
                      LinkedIn
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={4}
                  placeholder="Additional notes about this contact..."
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingContact ? 'Update Contact' : 'Create Contact'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex-1 min-w-[300px]">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name, title, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <Select value={trustFilter} onValueChange={setTrustFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Trusts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Trusts</SelectItem>
            {accounts.map((account) => (
              <SelectItem key={account.trust_code} value={account.trust_code}>
                {account.trust_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="decision_maker">Decision Makers</SelectItem>
            <SelectItem value="influencer">Influencers</SelectItem>
            <SelectItem value="champion">Champions</SelectItem>
          </SelectContent>
        </Select>

        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Stages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            <SelectItem value="prospect">Prospect</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="engaged">Engaged</SelectItem>
            <SelectItem value="active">Active</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="last_contact">Last Contact</SelectItem>
            <SelectItem value="name">Name</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grouped Contacts List */}
      <div className="space-y-4">
        {Object.entries(groupedContacts).map(([trustCode, group]) => (
          <Collapsible
            key={trustCode}
            open={expandedTrusts.has(trustCode)}
            onOpenChange={() => toggleTrust(trustCode)}
          >
            <Card>
              <CollapsibleTrigger className="w-full">
                <CardHeader className="cursor-pointer hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {expandedTrusts.has(trustCode) ? (
                        <ChevronDown className="h-5 w-5 text-gray-500" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-500" />
                      )}
                      <Building2 className="h-5 w-5 text-[#005eb8]" />
                      <div className="text-left">
                        <CardTitle className="text-lg">{group.trust_name}</CardTitle>
                        <p className="text-sm text-gray-500 mt-1">
                          {group.contacts.length} contact{group.contacts.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline">{trustCode}</Badge>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {group.contacts.map((contact) => {
                      const daysSince = getDaysSinceContact(contact.last_contact_date);
                      const badges = getRoleBadges(contact);

                      return (
                        <Card key={contact.id} className="hover:shadow-lg transition-shadow">
                          <CardHeader className="pb-3">
                            <div className="flex items-start gap-3">
                              <Avatar className="h-12 w-12 bg-[#005eb8]">
                                <AvatarFallback className="bg-[#005eb8] text-white font-semibold">
                                  {getInitials(contact.full_name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <CardTitle className="text-base line-clamp-1">
                                  {contact.full_name}
                                </CardTitle>
                                <p className="text-sm text-gray-600 line-clamp-1 mt-0.5">
                                  {contact.job_title}
                                </p>
                                {contact.department && (
                                  <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                                    {contact.department}
                                  </p>
                                )}
                              </div>
                            </div>
                          </CardHeader>

                          <CardContent className="space-y-3">
                            {/* Role Badges */}
                            {badges.length > 0 && (
                              <div className="flex gap-1.5 flex-wrap">
                                {badges.map((badge, idx) => (
                                  <Badge
                                    key={idx}
                                    variant={badge.variant as any}
                                    className="text-xs"
                                  >
                                    {badge.label}
                                  </Badge>
                                ))}
                              </div>
                            )}

                            {/* Contact Details */}
                            <div className="space-y-2 text-sm">
                              {contact.email && (
                                <div className="flex items-center gap-2 text-gray-600">
                                  <Mail className="h-3.5 w-3.5 shrink-0" />
                                  <a
                                    href={`mailto:${contact.email}`}
                                    className="hover:text-[#005eb8] truncate"
                                  >
                                    {contact.email}
                                  </a>
                                </div>
                              )}
                              {contact.phone && (
                                <div className="flex items-center gap-2 text-gray-600">
                                  <Phone className="h-3.5 w-3.5 shrink-0" />
                                  <a
                                    href={`tel:${contact.phone}`}
                                    className="hover:text-[#005eb8]"
                                  >
                                    {contact.phone}
                                  </a>
                                </div>
                              )}
                              {contact.linkedin_url && (
                                <div className="flex items-center gap-2 text-gray-600">
                                  <Linkedin className="h-3.5 w-3.5 shrink-0" />
                                  <a
                                    href={contact.linkedin_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:text-[#005eb8] truncate"
                                  >
                                    LinkedIn Profile
                                  </a>
                                </div>
                              )}
                            </div>

                            {/* Last Contact */}
                            {contact.last_contact_date ? (
                              <div className="flex items-center gap-2 text-sm text-gray-500 pt-2 border-t">
                                <Calendar className="h-3.5 w-3.5" />
                                <span>Last contact: {daysSince}d ago</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-sm text-gray-400 pt-2 border-t">
                                <Calendar className="h-3.5 w-3.5" />
                                <span>No contact recorded</span>
                              </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex gap-2 pt-2">
                              <Link href={`/crm/accounts/${contact.trust_code}`} className="flex-1">
                                <Button variant="outline" size="sm" className="w-full gap-1">
                                  <Building2 className="h-3.5 w-3.5" />
                                  View Trust
                                </Button>
                              </Link>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditDialog(contact)}
                                className="gap-1"
                              >
                                <Edit className="h-3.5 w-3.5" />
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(contact.id)}
                                className="gap-1 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        ))}
      </div>

      {filteredContacts.length === 0 && (
        <div className="text-center py-12">
          <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900">No contacts found</h3>
          <p className="text-gray-600 mt-1">
            {searchTerm ||
            trustFilter !== 'all' ||
            roleFilter !== 'all' ||
            stageFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Get started by adding your first contact'}
          </p>
        </div>
      )}
    </div>
  );
}
