'use client';

import { useState, useEffect } from 'react';
import { use } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Building2,
  User,
  Calendar,
  AlertTriangle,
  Phone,
  Mail,
  MapPin,
  Plus,
  Edit,
  TrendingUp,
  Clock,
  MessageSquare,
  FileText,
  Activity as ActivityIcon,
  CheckCircle2,
  Circle,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';

// Types
interface TrustAccount {
  trust_code: string;
  trust_name: string;
  icb_code: string;
  icb_name: string;
  account_owner: string | null;
  account_stage: string | null;
  last_contact_date: string | null;
  next_follow_up_date: string | null;
  days_since_contact: number | null;
  created_at: string;
  updated_at: string;
}

interface Contact {
  id: string;
  trust_code: string;
  name: string;
  job_title: string;
  department: string;
  email: string;
  phone: string;
  role_type: string;
  is_decision_maker: boolean;
  is_influencer: boolean;
  is_champion: boolean;
  last_contact_date: string | null;
  notes: string | null;
  created_at: string;
}

interface Opportunity {
  id: string;
  trust_code: string;
  name: string;
  stage: string;
  value: number;
  probability: number;
  expected_close_date: string;
  description: string | null;
  created_at: string;
}

interface Activity {
  id: string;
  trust_code: string;
  contact_id: string | null;
  opportunity_id: string | null;
  activity_type: string;
  activity_date: string;
  subject: string;
  description: string;
  outcome: string | null;
  next_steps: string | null;
  logged_by: string;
  created_at: string;
}

interface AccountNote {
  id: string;
  trust_code: string;
  note: string;
  created_by: string;
  created_at: string;
}

export default function TrustProfilePage({ params }: { params: Promise<{ trustCode: string }> }) {
  const { trustCode } = use(params);
  const { user, profile } = useAuth();

  // State
  const [account, setAccount] = useState<TrustAccount | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [notes, setNotes] = useState<AccountNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('contacts');

  // Modal states
  const [showAddContact, setShowAddContact] = useState(false);
  const [showAddOpportunity, setShowAddOpportunity] = useState(false);
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);

  // Form states
  const [newNote, setNewNote] = useState('');
  const [newContact, setNewContact] = useState({
    name: '',
    job_title: '',
    department: '',
    email: '',
    phone: '',
    role_type: 'other',
    is_decision_maker: false,
    is_influencer: false,
    is_champion: false,
    notes: '',
  });
  const [newOpportunity, setNewOpportunity] = useState({
    name: '',
    stage: 'qualification',
    value: 0,
    probability: 10,
    expected_close_date: '',
    description: '',
  });
  const [newActivity, setNewActivity] = useState({
    contact_id: '',
    activity_type: 'email',
    activity_date: new Date().toISOString().split('T')[0],
    subject: '',
    description: '',
    outcome: '',
    next_steps: '',
  });
  const [selectedContactId, setSelectedContactId] = useState<string>('');

  useEffect(() => {
    if (trustCode) {
      fetchAllData();
    }
  }, [trustCode]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchAccount(),
        fetchContacts(),
        fetchOpportunities(),
        fetchActivities(),
        fetchNotes(),
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccount = async () => {
    try {
      const response = await fetch(`/api/crm/accounts/${trustCode}`);
      const result = await response.json();
      if (result.data) {
        setAccount(result.data);
      }
    } catch (error) {
      console.error('Error fetching account:', error);
    }
  };

  const fetchContacts = async () => {
    try {
      const response = await fetch(`/api/crm/contacts?trust_code=${trustCode}`);
      const result = await response.json();
      if (result.data) {
        setContacts(result.data);
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  };

  const fetchOpportunities = async () => {
    try {
      const response = await fetch(`/api/crm/opportunities?trust_code=${trustCode}`);
      const result = await response.json();
      if (result.data) {
        setOpportunities(result.data);
      }
    } catch (error) {
      console.error('Error fetching opportunities:', error);
    }
  };

  const fetchActivities = async () => {
    try {
      const response = await fetch(`/api/crm/activities?trust_code=${trustCode}`);
      const result = await response.json();
      if (result.data) {
        setActivities(result.data);
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
    }
  };

  const fetchNotes = async () => {
    try {
      const response = await fetch(`/api/crm/account-notes?trust_code=${trustCode}`);
      const result = await response.json();
      if (result.data) {
        setNotes(result.data);
      }
    } catch (error) {
      console.error('Error fetching notes:', error);
    }
  };

  const updateAccount = async (field: string, value: any) => {
    try {
      const response = await fetch(`/api/crm/accounts/${trustCode}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });

      if (response.ok) {
        await fetchAccount();
      }
    } catch (error) {
      console.error('Error updating account:', error);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    try {
      const response = await fetch('/api/crm/account-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trust_code: trustCode,
          note: newNote,
          created_by: user?.email || 'Unknown',
        }),
      });

      if (response.ok) {
        setNewNote('');
        setShowAddNote(false);
        await fetchNotes();
      }
    } catch (error) {
      console.error('Error adding note:', error);
    }
  };

  const handleAddContact = async () => {
    try {
      const response = await fetch('/api/crm/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newContact,
          trust_code: trustCode,
        }),
      });

      if (response.ok) {
        setNewContact({
          name: '',
          job_title: '',
          department: '',
          email: '',
          phone: '',
          role_type: 'other',
          is_decision_maker: false,
          is_influencer: false,
          is_champion: false,
          notes: '',
        });
        setShowAddContact(false);
        await fetchContacts();
      }
    } catch (error) {
      console.error('Error adding contact:', error);
    }
  };

  const handleAddOpportunity = async () => {
    try {
      const response = await fetch('/api/crm/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newOpportunity,
          trust_code: trustCode,
          owner_email: user?.email,
        }),
      });

      if (response.ok) {
        setNewOpportunity({
          name: '',
          stage: 'qualification',
          value: 0,
          probability: 10,
          expected_close_date: '',
          description: '',
        });
        setShowAddOpportunity(false);
        await fetchOpportunities();
      }
    } catch (error) {
      console.error('Error adding opportunity:', error);
    }
  };

  const handleAddActivity = async () => {
    try {
      const response = await fetch('/api/crm/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newActivity,
          trust_code: trustCode,
          logged_by: user?.email || 'Unknown',
        }),
      });

      if (response.ok) {
        setNewActivity({
          contact_id: '',
          activity_type: 'email',
          activity_date: new Date().toISOString().split('T')[0],
          subject: '',
          description: '',
          outcome: '',
          next_steps: '',
        });
        setShowAddActivity(false);
        await fetchActivities();
        await fetchAccount(); // Refresh to update last contact date
      }
    } catch (error) {
      console.error('Error adding activity:', error);
    }
  };

  const handleLogCall = (contactId: string) => {
    setNewActivity({
      contact_id: contactId,
      activity_type: 'call',
      activity_date: new Date().toISOString().split('T')[0],
      subject: '',
      description: '',
      outcome: '',
      next_steps: '',
    });
    setSelectedContactId(contactId);
    setShowAddActivity(true);
  };

  const getStageColor = (stage: string | null) => {
    const colors: Record<string, string> = {
      prospect: 'bg-gray-100 text-gray-800',
      contacted: 'bg-blue-100 text-blue-800',
      engaged: 'bg-green-100 text-green-800',
      active_client: 'bg-emerald-100 text-emerald-800',
      churned: 'bg-red-100 text-red-800',
    };
    return colors[stage || 'prospect'] || colors.prospect;
  };

  const getOpportunityStageColor = (stage: string) => {
    const colors: Record<string, string> = {
      qualification: 'bg-gray-100 text-gray-800',
      proposal: 'bg-blue-100 text-blue-800',
      negotiation: 'bg-yellow-100 text-yellow-800',
      closed_won: 'bg-green-100 text-green-800',
      closed_lost: 'bg-red-100 text-red-800',
    };
    return colors[stage] || colors.qualification;
  };

  const getActivityIcon = (type: string) => {
    const icons: Record<string, any> = {
      call: Phone,
      meeting: Calendar,
      email: Mail,
      note: MessageSquare,
    };
    return icons[type] || ActivityIcon;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#005eb8] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading account details...</p>
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900">Account not found</h3>
          <p className="text-gray-600 mt-1">The requested trust account could not be found.</p>
          <Link href="/crm/accounts">
            <Button className="mt-4" variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Accounts
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const isOverdue = account.days_since_contact && account.days_since_contact > 30;

  return (
    <div className="p-6 space-y-6">
      {/* Back Navigation */}
      <Link href="/crm/accounts">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Accounts
        </Button>
      </Link>

      {/* Header Section */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Building2 className="h-8 w-8 text-[#005eb8]" />
                <div>
                  <CardTitle className="text-2xl">{account.trust_name}</CardTitle>
                  <CardDescription className="text-base mt-1">
                    {account.trust_code} • {account.icb_name}
                  </CardDescription>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                {account.account_stage && (
                  <Badge className={getStageColor(account.account_stage)}>
                    {account.account_stage.replace('_', ' ')}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Account Management Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t">
            {/* Account Owner */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Account Owner
              </label>
              <Select
                value={account.account_owner || ''}
                onValueChange={(value) => updateAccount('account_owner', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Assign owner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={user?.email || ''}>{profile?.full_name || user?.email}</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Account Stage */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Account Stage
              </label>
              <Select
                value={account.account_stage || 'prospect'}
                onValueChange={(value) => updateAccount('account_stage', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="prospect">Prospect</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="engaged">Engaged</SelectItem>
                  <SelectItem value="active_client">Active Client</SelectItem>
                  <SelectItem value="churned">Churned</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Last Contact */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Last Contact
              </label>
              <div className={`flex items-center gap-2 p-2 rounded-md border ${
                isOverdue ? 'bg-red-50 border-red-300' : 'bg-white'
              }`}>
                <Clock className={`h-4 w-4 ${isOverdue ? 'text-red-600' : 'text-gray-400'}`} />
                <span className={`text-sm ${isOverdue ? 'text-red-700 font-medium' : 'text-gray-600'}`}>
                  {account.days_since_contact ? `${account.days_since_contact}d ago` : 'Never contacted'}
                </span>
                {isOverdue && <AlertTriangle className="h-4 w-4 text-red-600 ml-auto" />}
              </div>
            </div>

            {/* Next Follow-up */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Next Follow-up
              </label>
              <div className="flex items-center gap-2 p-2 rounded-md border bg-white">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">
                  {formatDate(account.next_follow_up_date)}
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs Section */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="contacts" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Contacts ({contacts.length})
          </TabsTrigger>
          <TabsTrigger value="opportunities" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Opportunities ({opportunities.length})
          </TabsTrigger>
          <TabsTrigger value="activities" className="flex items-center gap-2">
            <ActivityIcon className="h-4 w-4" />
            Activities ({activities.length})
          </TabsTrigger>
          <TabsTrigger value="notes" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Notes ({notes.length})
          </TabsTrigger>
          <TabsTrigger value="details" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Details
          </TabsTrigger>
        </TabsList>

        {/* Contacts Tab */}
        <TabsContent value="contacts" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Key Contacts</h3>
            <Sheet open={showAddContact} onOpenChange={setShowAddContact}>
              <SheetTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Contact
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Add New Contact</SheetTitle>
                  <SheetDescription>
                    Add a new contact for {account.trust_name}
                  </SheetDescription>
                </SheetHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label className="text-sm font-medium">Name *</label>
                    <Input
                      value={newContact.name}
                      onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                      placeholder="John Smith"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Job Title *</label>
                    <Input
                      value={newContact.job_title}
                      onChange={(e) => setNewContact({ ...newContact, job_title: e.target.value })}
                      placeholder="Clinical Director"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Department</label>
                    <Input
                      value={newContact.department}
                      onChange={(e) => setNewContact({ ...newContact, department: e.target.value })}
                      placeholder="Cardiology"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email *</label>
                    <Input
                      type="email"
                      value={newContact.email}
                      onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                      placeholder="john.smith@nhs.uk"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Phone</label>
                    <Input
                      value={newContact.phone}
                      onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                      placeholder="020 1234 5678"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Role Type</label>
                    <Select
                      value={newContact.role_type}
                      onValueChange={(value) => setNewContact({ ...newContact, role_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="clinical">Clinical</SelectItem>
                        <SelectItem value="procurement">Procurement</SelectItem>
                        <SelectItem value="finance">Finance</SelectItem>
                        <SelectItem value="it">IT</SelectItem>
                        <SelectItem value="management">Management</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Role Attributes</label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={newContact.is_decision_maker}
                          onChange={(e) => setNewContact({ ...newContact, is_decision_maker: e.target.checked })}
                          className="rounded"
                        />
                        <span className="text-sm">Decision Maker</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={newContact.is_influencer}
                          onChange={(e) => setNewContact({ ...newContact, is_influencer: e.target.checked })}
                          className="rounded"
                        />
                        <span className="text-sm">Influencer</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={newContact.is_champion}
                          onChange={(e) => setNewContact({ ...newContact, is_champion: e.target.checked })}
                          className="rounded"
                        />
                        <span className="text-sm">Champion</span>
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Notes</label>
                    <Textarea
                      value={newContact.notes}
                      onChange={(e) => setNewContact({ ...newContact, notes: e.target.value })}
                      placeholder="Additional notes..."
                      rows={3}
                    />
                  </div>
                </div>
                <SheetFooter>
                  <Button onClick={handleAddContact} disabled={!newContact.name || !newContact.email}>
                    Add Contact
                  </Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </div>

          {contacts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No contacts added yet</p>
                <p className="text-sm text-gray-500 mt-1">Add your first contact to get started</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {contacts.map((contact) => (
                <Card key={contact.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{contact.full_name}</CardTitle>
                        <CardDescription>
                          {contact.job_title}
                          {contact.department && ` • ${contact.department}`}
                        </CardDescription>
                      </div>
                      <Button variant="ghost" size="icon">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex gap-2 flex-wrap">
                      {contact.is_decision_maker && (
                        <Badge variant="default">Decision Maker</Badge>
                      )}
                      {contact.is_influencer && (
                        <Badge variant="secondary">Influencer</Badge>
                      )}
                      {contact.is_champion && (
                        <Badge variant="outline">Champion</Badge>
                      )}
                    </div>

                    <div className="space-y-2 text-sm">
                      {contact.email && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Mail className="h-4 w-4" />
                          <a href={`mailto:${contact.email}`} className="hover:text-[#005eb8]">
                            {contact.email}
                          </a>
                        </div>
                      )}
                      {contact.phone && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Phone className="h-4 w-4" />
                          <a href={`tel:${contact.phone}`} className="hover:text-[#005eb8]">
                            {contact.phone}
                          </a>
                        </div>
                      )}
                      {contact.last_contact_date && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Clock className="h-4 w-4" />
                          <span>Last contact: {formatDate(contact.last_contact_date)}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 pt-2 border-t">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => handleLogCall(contact.id)}>
                        <Phone className="h-3 w-3 mr-1" />
                        Log Call
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1">
                        <Calendar className="h-3 w-3 mr-1" />
                        Schedule
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Opportunities Tab */}
        <TabsContent value="opportunities" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Active Opportunities</h3>
            <Sheet open={showAddOpportunity} onOpenChange={setShowAddOpportunity}>
              <SheetTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Opportunity
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Create New Opportunity</SheetTitle>
                  <SheetDescription>
                    Create a new sales opportunity for {account.trust_name}
                  </SheetDescription>
                </SheetHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label className="text-sm font-medium">Opportunity Name *</label>
                    <Input
                      value={newOpportunity.name}
                      onChange={(e) => setNewOpportunity({ ...newOpportunity, name: e.target.value })}
                      placeholder="e.g., Electronic Patient Records System"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Stage</label>
                    <Select
                      value={newOpportunity.stage}
                      onValueChange={(value) => setNewOpportunity({ ...newOpportunity, stage: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="qualification">Qualification</SelectItem>
                        <SelectItem value="proposal">Proposal</SelectItem>
                        <SelectItem value="negotiation">Negotiation</SelectItem>
                        <SelectItem value="closed_won">Closed Won</SelectItem>
                        <SelectItem value="closed_lost">Closed Lost</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Value (£)</label>
                    <Input
                      type="number"
                      value={newOpportunity.value}
                      onChange={(e) => setNewOpportunity({ ...newOpportunity, value: parseInt(e.target.value) || 0 })}
                      placeholder="50000"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Probability (%)</label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={newOpportunity.probability}
                      onChange={(e) => setNewOpportunity({ ...newOpportunity, probability: parseInt(e.target.value) || 0 })}
                      placeholder="25"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Expected Close Date</label>
                    <Input
                      type="date"
                      value={newOpportunity.expected_close_date}
                      onChange={(e) => setNewOpportunity({ ...newOpportunity, expected_close_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <Textarea
                      value={newOpportunity.description}
                      onChange={(e) => setNewOpportunity({ ...newOpportunity, description: e.target.value })}
                      placeholder="Opportunity details..."
                      rows={4}
                    />
                  </div>
                </div>
                <SheetFooter>
                  <Button onClick={handleAddOpportunity} disabled={!newOpportunity.name}>
                    Create Opportunity
                  </Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </div>

          {opportunities.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No opportunities yet</p>
                <p className="text-sm text-gray-500 mt-1">Create your first opportunity to track potential deals</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {opportunities.map((opp) => (
                <Card key={opp.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold text-lg">{opp.name}</h4>
                          <Badge className={getOpportunityStageColor(opp.stage)}>
                            {opp.stage.replace('_', ' ')}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">Value</p>
                            <p className="font-semibold text-gray-900">{formatCurrency(opp.value)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Probability</p>
                            <p className="font-semibold text-gray-900">{opp.probability}%</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Expected Close</p>
                            <p className="font-semibold text-gray-900">{formatDate(opp.expected_close_date)}</p>
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Activities Tab */}
        <TabsContent value="activities" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Recent Activity</h3>
            <Button onClick={() => setShowAddActivity(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Log Activity
            </Button>
          </div>

          {activities.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ActivityIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No activities recorded</p>
                <p className="text-sm text-gray-500 mt-1">Start logging activities to track engagement</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {activities.map((activity) => {
                const Icon = getActivityIcon(activity.activity_type);
                return (
                  <Card key={activity.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="bg-[#005eb8] bg-opacity-10 p-2 rounded-full">
                          <Icon className="h-5 w-5 text-[#005eb8]" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-semibold">{activity.subject}</h4>
                            <span className="text-sm text-gray-500">
                              {formatDate(activity.activity_date)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{activity.notes}</p>
                          {activity.outcome && (
                            <div className="text-sm mb-2">
                              <span className="font-medium text-gray-700">Outcome: </span>
                              <span className="text-gray-600">{activity.outcome}</span>
                            </div>
                          )}
                          {activity.next_steps && (
                            <div className="text-sm bg-blue-50 p-2 rounded">
                              <span className="font-medium text-blue-900">Next Steps: </span>
                              <span className="text-blue-800">{activity.next_steps}</span>
                            </div>
                          )}
                          <div className="text-xs text-gray-500 mt-2">
                            Logged by {activity.logged_by}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Account Notes</h3>
            <Sheet open={showAddNote} onOpenChange={setShowAddNote}>
              <SheetTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Note
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Add Note</SheetTitle>
                  <SheetDescription>
                    Add a note for {account.trust_name}
                  </SheetDescription>
                </SheetHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label className="text-sm font-medium">Note *</label>
                    <Textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Enter your note here..."
                      rows={10}
                    />
                  </div>
                </div>
                <SheetFooter>
                  <Button onClick={handleAddNote} disabled={!newNote.trim()}>
                    Add Note
                  </Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </div>

          {notes.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No notes yet</p>
                <p className="text-sm text-gray-500 mt-1">Add notes to keep track of important information</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {notes.map((note) => (
                <Card key={note.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-700">{note.created_by}</span>
                      </div>
                      <span className="text-sm text-gray-500">{formatDate(note.created_at)}</span>
                    </div>
                    <p className="text-gray-700 whitespace-pre-wrap">{note.note}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Trust Information</CardTitle>
              <CardDescription>
                Administrative details and system information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">NHS Trust Code</label>
                  <p className="text-gray-900 mt-1">{account.trust_code}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Trust Name</label>
                  <p className="text-gray-900 mt-1">{account.trust_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">ICB Code</label>
                  <p className="text-gray-900 mt-1">{account.icb_code}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">ICB Name</label>
                  <p className="text-gray-900 mt-1">{account.icb_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Account Created</label>
                  <p className="text-gray-900 mt-1">{formatDate(account.created_at)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Last Updated</label>
                  <p className="text-gray-900 mt-1">{formatDate(account.updated_at)}</p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Quick Stats</h4>
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <User className="h-6 w-6 text-[#005eb8] mx-auto mb-2" />
                      <p className="text-2xl font-bold text-gray-900">{contacts.length}</p>
                      <p className="text-sm text-gray-600">Contacts</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <TrendingUp className="h-6 w-6 text-[#005eb8] mx-auto mb-2" />
                      <p className="text-2xl font-bold text-gray-900">{opportunities.length}</p>
                      <p className="text-sm text-gray-600">Opportunities</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <ActivityIcon className="h-6 w-6 text-[#005eb8] mx-auto mb-2" />
                      <p className="text-2xl font-bold text-gray-900">{activities.length}</p>
                      <p className="text-sm text-gray-600">Activities</p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div className="pt-4 border-t">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Pipeline Value</h4>
                <p className="text-3xl font-bold text-gray-900">
                  {formatCurrency(
                    opportunities.reduce((sum, opp) => sum + (opp.value * opp.probability / 100), 0)
                  )}
                </p>
                <p className="text-sm text-gray-600 mt-1">Weighted pipeline value</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Activity Sheet - accessible from any tab */}
      <Sheet open={showAddActivity} onOpenChange={setShowAddActivity}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Log Activity</SheetTitle>
            <SheetDescription>
              Record an activity for {account.trust_name}
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Activity Type</label>
              <Select
                value={newActivity.activity_type}
                onValueChange={(value) => setNewActivity({ ...newActivity, activity_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">Phone Call</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="note">Note</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Date</label>
              <Input
                type="date"
                value={newActivity.activity_date}
                onChange={(e) => setNewActivity({ ...newActivity, activity_date: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Subject *</label>
              <Input
                value={newActivity.subject}
                onChange={(e) => setNewActivity({ ...newActivity, subject: e.target.value })}
                placeholder="e.g., Follow-up call regarding proposal"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description *</label>
              <Textarea
                value={newActivity.description}
                onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })}
                placeholder="What was discussed or done..."
                rows={4}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Outcome</label>
              <Input
                value={newActivity.outcome}
                onChange={(e) => setNewActivity({ ...newActivity, outcome: e.target.value })}
                placeholder="e.g., Positive response, scheduled follow-up"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Next Steps</label>
              <Textarea
                value={newActivity.next_steps}
                onChange={(e) => setNewActivity({ ...newActivity, next_steps: e.target.value })}
                placeholder="What needs to be done next..."
                rows={3}
              />
            </div>
          </div>
          <SheetFooter>
            <Button onClick={handleAddActivity} disabled={!newActivity.subject || !newActivity.description}>
              Log Activity
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
